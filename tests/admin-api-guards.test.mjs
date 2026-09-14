import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const guardedRoutes = [
  "src/app/api/users/route.ts",
  "src/app/api/teachers/route.ts",
  "src/app/api/students/route.ts",
  "src/app/api/subjects/route.ts",
  "src/app/api/classes/route.ts",
  "src/app/api/faces/route.ts",
  "src/app/api/attendance/route.ts",
  "src/app/api/admin/reports/route.ts",
  "src/app/api/admin/settings/route.ts",
  "src/app/api/admin/profile-requests/route.ts",
  "src/app/api/admin/students/import/route.ts",
  "src/app/api/admin/students/import/preview/route.ts",
  "src/app/api/admin/students/import/template/route.ts",
];

test("Admin API ทุกกลุ่มตรวจสอบ Admin session ฝั่ง Server", async () => {
  for (const route of guardedRoutes) {
    const source = await readFile(new URL(`../${route}`, import.meta.url), "utf8");
    assert.match(source, /getAdminSession/, `${route} ต้องตรวจสอบ Admin session`);
    assert.match(source, /status:\s*401/, `${route} ต้องตอบ 401 เมื่อไม่มีสิทธิ์`);
  }
});

test("Import นักเรียนจำกัดชนิด ขนาด และจำนวนข้อมูล", async () => {
  const source = await readFile(
    new URL("../src/app/api/admin/students/import/preview/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /SUPPORTED_FILE/);
  assert.match(source, /10\s*\*\s*1024\s*\*\s*1024/);
  assert.match(source, /raw\.length\s*>\s*500/);
  assert.match(source, /seenCodes/);
  assert.match(source, /seenNumbers/);
});
