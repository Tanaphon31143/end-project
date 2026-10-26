import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { File } from "node:buffer";
import test from "node:test";
import ts from "typescript";

const constants = {
  ALLOWED_ANNOUNCEMENT_MIME_TYPES: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  MAX_ANNOUNCEMENT_ATTACHMENTS: 5,
  MAX_ANNOUNCEMENT_ATTACHMENT_BYTES: 10 * 1024 * 1024,
  MAX_ANNOUNCEMENT_MESSAGE_LENGTH: 5000,
};

function makeRoute({ session = { id: 41, role: "admin" }, capabilities = {} } = {}) {
  const calls = [];
  const defaults = {
    attachments: false,
    scheduling: false,
    richText: true,
    titleMaxLength: 200,
  };
  const database = {
    async execute(sql, params = []) {
      calls.push({ sql, params, kind: "direct" });
      if (sql.startsWith("DELETE FROM school_announcements")) return [{ affectedRows: 1 }, undefined];
      return [[], undefined];
    },
    async getConnection() {
      calls.push({ kind: "getConnection" });
      return {
        async beginTransaction() { calls.push({ kind: "begin" }); },
        async commit() { calls.push({ kind: "commit" }); },
        async rollback() { calls.push({ kind: "rollback" }); },
        release() { calls.push({ kind: "release" }); },
        async execute(sql, params = []) {
          calls.push({ sql, params, kind: "transaction" });
          if (sql.startsWith("SELECT id FROM school_announcements")) return [[{ id: 7 }], undefined];
          if (sql.startsWith("SELECT COUNT(*) total FROM school_announcement_attachments")) return [[{ total: 0 }], undefined];
          return [{ insertId: 19, affectedRows: 1 }, undefined];
        },
      };
    },
  };
  const listing = { announcements: [], stats: { total: 0, published: 0, scheduled: 0, hidden: 0 }, total: 0, page: 1, pageSize: 20, hasMore: false, capabilities: defaults };
  const dependencies = {
    "@/lib/auth": { getAdminSession: async () => session },
    "@/lib/announcements": {
      ...constants,
      getAnnouncementCapabilities: async () => ({ ...defaults, ...capabilities }),
      getAdminAnnouncements: async () => listing,
    },
    "@/lib/db": { db: database },
  };
  const exports = {};
  const source = fs.readFileSync(new URL("../src/app/api/admin/announcements/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    URL,
    Request,
    Response,
    FormData,
    File,
    Buffer,
    console,
    process: { env: { NODE_ENV: "test" } },
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { route: exports, calls };
}

function jsonRequest(method, body, headers = {}) {
  return new Request("https://school.example/api/admin/announcements", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("all announcement CRUD handlers reject unauthenticated requests before database access", async () => {
  const { route, calls } = makeRoute({ session: null });
  assert.equal((await route.GET(new Request("https://school.example/api/admin/announcements"))).status, 401);
  assert.equal((await route.POST(jsonRequest("POST", { title: "x", message: "y" }))).status, 401);
  assert.equal((await route.PATCH(jsonRequest("PATCH", { id: 7, title: "x" }))).status, 401);
  assert.equal((await route.DELETE(jsonRequest("DELETE", { id: 7 }))).status, 401);
  assert.deepEqual(calls, []);
});

test("cross-origin mutation is rejected before any database write", async () => {
  const { route, calls } = makeRoute();
  const response = await route.POST(jsonRequest("POST", { title: "ประกาศ", message: "ข้อความ" }, {
    origin: "https://attacker.example",
    host: "school.example",
  }));
  assert.equal(response.status, 403);
  assert.equal(calls.some((call) => call.kind === "getConnection"), false);
});

test("scheduling remains unavailable until the scheduling column exists", async () => {
  const { route, calls } = makeRoute();
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const response = await route.POST(jsonRequest("POST", {
    title: "Scheduled notice",
    message: "Future content",
    scheduledAt: future,
  }));
  assert.equal(response.status, 409);
  assert.equal(calls.some((call) => call.kind === "getConnection"), false);
});

test("scheduled announcement and verified attachment are saved in one transaction", async () => {
  const { route, calls } = makeRoute({ capabilities: { attachments: true, scheduling: true } });
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const pdf = Buffer.from("%PDF-1.7\nSchool notice\n");
  const form = new FormData();
  form.set("title", "Scheduled notice");
  form.set("message", "Available later");
  form.set("scheduledAt", future);
  form.append("attachments", new File([pdf], "notice.pdf", { type: "application/pdf" }));
  const response = await route.POST(new Request("https://school.example/api/admin/announcements", {
    method: "POST",
    body: form,
  }));
  assert.equal(response.status, 200);
  const announcementInsert = calls.find((call) => call.sql?.startsWith("INSERT INTO school_announcements"));
  assert.ok(announcementInsert);
  assert.match(announcementInsert.sql, /publish_at/);
  assert.equal(announcementInsert.params[2], future.slice(0, 23).replace("T", " "));
  const attachmentInsert = calls.find((call) => call.sql?.startsWith("INSERT INTO school_announcement_attachments"));
  assert.ok(attachmentInsert);
  assert.deepEqual(Array.from(attachmentInsert.params.slice(0, 4)), [19, "notice.pdf", "application/pdf", pdf.length]);
  assert.equal(attachmentInsert.params[4].toString(), pdf.toString());
  assert.ok(calls.some((call) => call.kind === "commit"));
});

function multipartRequest(fields, files = []) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  for (const file of files) form.append("attachments", file);
  return new Request("https://school.example/api/admin/announcements", { method: "POST", body: form });
}

test("upload validation rejects spoofed MIME, more than five files, and files above 10 MiB", async (t) => {
  const capabilities = { attachments: true, scheduling: true };
  const fields = { title: "ประกาศ", message: "ข้อความ" };
  await t.test("spoofed signature", async () => {
    const { route, calls } = makeRoute({ capabilities });
    const request = multipartRequest(fields, [new File(["not a PNG"], "notice.png", { type: "image/png" })]);
    assert.equal((await route.POST(request)).status, 400);
    assert.equal(calls.some((call) => call.kind === "getConnection"), false);
  });
  await t.test("six files", async () => {
    const { route, calls } = makeRoute({ capabilities });
    const files = Array.from({ length: 6 }, (_, index) => new File(["x"], `f${index}.pdf`, { type: "application/pdf" }));
    assert.equal((await route.POST(multipartRequest(fields, files))).status, 400);
    assert.equal(calls.some((call) => call.kind === "getConnection"), false);
  });
  await t.test("over 10 MiB", async () => {
    const { route, calls } = makeRoute({ capabilities });
    const payload = Buffer.alloc(10 * 1024 * 1024 + 1);
    payload.write("%PDF-");
    const file = new File([payload], "large.pdf", { type: "application/pdf" });
    assert.equal((await route.POST(multipartRequest(fields, [file]))).status, 400);
    assert.equal(calls.some((call) => call.kind === "getConnection"), false);
  });
});

test("a text-only edit of a hidden announcement preserves its hidden status", async () => {
  const { route, calls } = makeRoute();
  const response = await route.PATCH(jsonRequest("PATCH", { id: 7, title: "Updated title" }));
  assert.equal(response.status, 200);
  const update = calls.find((call) => call.sql?.startsWith("UPDATE school_announcements SET"));
  assert.ok(update);
  assert.match(update.sql, /SET title=\?/);
  assert.doesNotMatch(update.sql, /is_published|publish_at/);
  assert.deepEqual(Array.from(update.params), ["Updated title", 7]);
});

test("authorized delete removes the requested announcement and returns the refreshed listing", async () => {
  const { route, calls } = makeRoute();
  const response = await route.DELETE(jsonRequest("DELETE", { id: 7 }));
  assert.equal(response.status, 200);
  assert.ok(calls.some((call) => call.sql === "DELETE FROM school_announcements WHERE id=?" && call.params[0] === 7));
  assert.ok(await response.json());
});
