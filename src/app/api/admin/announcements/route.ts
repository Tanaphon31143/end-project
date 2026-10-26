import { getAdminSession } from "@/lib/auth";
import {
  ALLOWED_ANNOUNCEMENT_MIME_TYPES,
  getAdminAnnouncements,
  getAnnouncementCapabilities,
  MAX_ANNOUNCEMENT_ATTACHMENTS,
  MAX_ANNOUNCEMENT_ATTACHMENT_BYTES,
  MAX_ANNOUNCEMENT_MESSAGE_LENGTH,
} from "@/lib/announcements";
import { db } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES =
  MAX_ANNOUNCEMENT_ATTACHMENTS * MAX_ANNOUNCEMENT_ATTACHMENT_BYTES +
  1024 * 1024;

type MutationBody = {
  id?: unknown;
  title?: unknown;
  message?: unknown;
  scheduledAt?: unknown;
  published?: unknown;
  removeAttachmentIds?: unknown;
};
type UploadedAttachment = {
  name: string;
  mime: (typeof ALLOWED_ANNOUNCEMENT_MIME_TYPES)[number];
  size: number;
  data: Buffer;
};

function responseError(message: string, status = 400) {
  return Response.json({ message }, { status });
}

function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const protocol =
      request.headers.get("x-forwarded-proto") ??
      new URL(request.url).protocol.replace(":", "");
    const expected = host ? `${protocol}://${host}` : new URL(request.url).origin;
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

function checkMutationRequest(request: Request, allowed: string[]) {
  if (!sameOrigin(request)) {
    return responseError("คำขอถูกปฏิเสธเพื่อความปลอดภัย", 403);
  }
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (!contentType || !allowed.includes(contentType)) {
    return responseError("รูปแบบข้อมูลไม่ถูกต้อง", 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return responseError("ไฟล์รวมมีขนาดใหญ่เกินไป", 413);
  }
  if (contentType === "application/json" && contentLength > 16 * 1024) {
    return responseError("ข้อมูลมีขนาดใหญ่เกินไป", 413);
  }
  return null;
}

async function readPayload(request: Request): Promise<{
  body: MutationBody;
  uploads: File[];
} | Response> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType === "application/json") {
    try {
      const body = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return responseError("ข้อมูลไม่ถูกต้อง");
      }
      return { body: body as MutationBody, uploads: [] };
    } catch {
      return responseError("ข้อมูล JSON ไม่ถูกต้อง");
    }
  }
  try {
    const form = await request.formData();
    const body: MutationBody = {
      id: form.get("id") ?? undefined,
      title: form.get("title") ?? undefined,
      message: form.get("message") ?? undefined,
      scheduledAt: form.get("scheduledAt") ?? undefined,
      removeAttachmentIds: form.get("removeAttachmentIds") ?? undefined,
    };
    const uploads = [...form.getAll("attachments"), ...form.getAll("files")]
      .filter((item): item is File => item instanceof File && (item.size > 0 || item.name.length > 0));
    return { body, uploads };
  } catch {
    return responseError("ไม่สามารถอ่านข้อมูลที่ส่งมาได้");
  }
}

function parseFutureSchedule(value: unknown): { sqlValue: string | null } | { error: string } {
  if (value === null || value === undefined || value === "") return { sqlValue: null };
  if (typeof value !== "string") return { error: "วันและเวลาเผยแพร่ไม่ถูกต้อง" };

  let date: Date;
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
  const match = local.exec(value);
  if (match) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", millisecondText = "0"] = match;
    const [year, month, day, hour, minute, second, millisecond] = [
      yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText.padEnd(3, "0"),
    ].map(Number);
    const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
    if (
      calendar.getUTCFullYear() !== year ||
      calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day ||
      hour > 23 || minute > 59 || second > 59
    ) return { error: "วันและเวลาเผยแพร่ไม่ถูกต้อง" };
    // datetime-local values represent Asia/Bangkok, regardless of the server timezone.
    date = new Date(calendar.getTime() - 7 * 60 * 60 * 1000);
  } else {
    const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
    if (!hasZone || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return { error: "กรุณาระบุเวลาเป็นเขตเวลา Asia/Bangkok" };
    }
    date = new Date(value);
  }
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    return { error: "เวลาเผยแพร่ต้องอยู่ในอนาคต" };
  }
  return {
    sqlValue: date.toISOString().slice(0, 23).replace("T", " "),
  };
}

function detectMime(data: Buffer) {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) return "image/webp";
  if (data.length >= 5 && data.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

function safeStoredName(value: string) {
  const name = value
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255);
  return name || "attachment";
}

async function validateUploads(files: File[]): Promise<UploadedAttachment[] | Response> {
  if (files.length > MAX_ANNOUNCEMENT_ATTACHMENTS) {
    return responseError(`แนบไฟล์ได้ไม่เกิน ${MAX_ANNOUNCEMENT_ATTACHMENTS} ไฟล์`);
  }
  const attachments: UploadedAttachment[] = [];
  for (const file of files) {
    if (file.size <= 0 || file.size > MAX_ANNOUNCEMENT_ATTACHMENT_BYTES) {
      return responseError("ไฟล์แต่ละไฟล์ต้องมีขนาดไม่เกิน 10 MB");
    }
    const data = Buffer.from(await file.arrayBuffer());
    const mime = detectMime(data);
    if (
      !mime ||
      !ALLOWED_ANNOUNCEMENT_MIME_TYPES.includes(mime as UploadedAttachment["mime"]) ||
      (file.type && file.type !== mime)
    ) {
      return responseError("รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF ที่ถูกต้อง");
    }
    attachments.push({
      name: safeStoredName(file.name),
      mime: mime as UploadedAttachment["mime"],
      size: data.length,
      data,
    });
  }
  return attachments;
}

function parseId(value: unknown) {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isSafeInteger(id) && Number(id) > 0 ? Number(id) : null;
}

function parseRemoveIds(value: unknown): number[] | Response {
  if (value === undefined || value === null || value === "") return [];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return responseError("รายการไฟล์ที่ต้องการลบไม่ถูกต้อง"); }
  }
  if (!Array.isArray(parsed)) return responseError("รายการไฟล์ที่ต้องการลบไม่ถูกต้อง");
  const ids: number[] = [];
  for (const item of parsed) {
    const id = parseId(item);
    if (!id) return responseError("รายการไฟล์ที่ต้องการลบไม่ถูกต้อง");
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function validateText(body: MutationBody, titleMaxLength: number) {
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > titleMaxLength) {
      return responseError(`หัวข้อต้องมี 1–${titleMaxLength} ตัวอักษร`);
    }
  }
  if (body.message !== undefined) {
    if (
      typeof body.message !== "string" ||
      !body.message.trim() ||
      body.message.length > MAX_ANNOUNCEMENT_MESSAGE_LENGTH
    ) {
      return responseError("เนื้อหาต้องมี 1–5,000 ตัวอักษร");
    }
  }
  return null;
}

function listingResponse() {
  return getAdminAnnouncements().then((listing) =>
    Response.json(listing, { headers: { "Cache-Control": "private, no-store" } }),
  );
}

async function getHandler(request: Request) {
  if (!(await getAdminSession())) return responseError("ไม่มีสิทธิ์ใช้งาน", 401);
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const query = url.searchParams.get("query") ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const sort = url.searchParams.get("sort") ?? "newest";
  const listing = await getAdminAnnouncements({ page, pageSize, query, status, sort });
  return Response.json(listing, { headers: { "Cache-Control": "private, no-store" } });
}

async function postHandler(request: Request) {
  const session = await getAdminSession();
  if (!session) return responseError("ไม่มีสิทธิ์ใช้งาน", 401);
  const rejected = checkMutationRequest(request, ["application/json", "multipart/form-data"]);
  if (rejected) return rejected;
  const parsed = await readPayload(request);
  if (parsed instanceof Response) return parsed;
  const { body, uploads: files } = parsed;
  const capabilities = await getAnnouncementCapabilities();
  const invalidText = validateText(body, capabilities.titleMaxLength);
  if (invalidText) return invalidText;
  if (body.title === undefined || body.message === undefined) {
    return responseError("กรุณาระบุหัวข้อและเนื้อหาประกาศ");
  }
  const scheduleValue = parseFutureSchedule(body.scheduledAt);
  if ("error" in scheduleValue) return responseError(scheduleValue.error);
  if (scheduleValue.sqlValue && !capabilities.scheduling) {
    return responseError("ต้องอัปเดตฐานข้อมูลก่อนจึงจะตั้งเวลาเผยแพร่ได้", 409);
  }
  if (files.length && !capabilities.attachments) {
    return responseError("ต้องอัปเดตฐานข้อมูลก่อนจึงจะแนบไฟล์ได้", 409);
  }
  const attachments = await validateUploads(files);
  if (attachments instanceof Response) return attachments;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      capabilities.scheduling
        ? "INSERT INTO school_announcements (title,message,is_published,publish_at,created_by_admin_id) VALUES(?,?,1,?,?)"
        : "INSERT INTO school_announcements (title,message,is_published,created_by_admin_id) VALUES(?,?,1,?)",
      capabilities.scheduling
        ? [String(body.title).trim(), String(body.message).trim(), scheduleValue.sqlValue, session.id]
        : [String(body.title).trim(), String(body.message).trim(), session.id],
    );
    const announcementId = Number(result.insertId);
    if (attachments.length) {
      for (const attachment of attachments) {
        await connection.execute(
          "INSERT INTO school_announcement_attachments (announcement_id,file_name,mime_type,file_size,file_data) VALUES(?,?,?,?,?)",
          [announcementId, attachment.name, attachment.mime, attachment.size, attachment.data],
        );
      }
    }
    await connection.commit();
  } catch {
    await connection.rollback();
    return responseError("บันทึกประกาศไม่สำเร็จ กรุณาลองใหม่", 500);
  } finally {
    connection.release();
  }
  return listingResponse();
}

async function patchHandler(request: Request) {
  if (!(await getAdminSession())) return responseError("ไม่มีสิทธิ์ใช้งาน", 401);
  const rejected = checkMutationRequest(request, ["application/json", "multipart/form-data"]);
  if (rejected) return rejected;
  const parsed = await readPayload(request);
  if (parsed instanceof Response) return parsed;
  const { body, uploads: files } = parsed;
  const id = parseId(body.id);
  if (!id) return responseError("ข้อมูลไม่ถูกต้อง");
  const capabilities = await getAnnouncementCapabilities();
  const invalidText = validateText(body, capabilities.titleMaxLength);
  if (invalidText) return invalidText;
  if (typeof body.published !== "undefined" && typeof body.published !== "boolean") {
    return responseError("สถานะประกาศไม่ถูกต้อง");
  }
  const hasSchedule = body.scheduledAt !== undefined;
  const scheduleValue = hasSchedule ? parseFutureSchedule(body.scheduledAt) : null;
  if (scheduleValue && "error" in scheduleValue) return responseError(scheduleValue.error);
  if (
    body.published === false &&
    scheduleValue &&
    "sqlValue" in scheduleValue &&
    scheduleValue.sqlValue
  ) return responseError("ประกาศที่ซ่อนไว้ไม่สามารถตั้งเวลาเผยแพร่ได้");
  if (scheduleValue && "sqlValue" in scheduleValue && scheduleValue.sqlValue && !capabilities.scheduling) {
    return responseError("ต้องอัปเดตฐานข้อมูลก่อนจึงจะตั้งเวลาเผยแพร่ได้", 409);
  }
  const removeIds = parseRemoveIds(body.removeAttachmentIds);
  if (removeIds instanceof Response) return removeIds;
  if ((files.length || removeIds.length) && !capabilities.attachments) {
    return responseError("ต้องอัปเดตฐานข้อมูลก่อนจึงจะจัดการไฟล์แนบได้", 409);
  }
  const attachments = await validateUploads(files);
  if (attachments instanceof Response) return attachments;
  const hasText = body.title !== undefined || body.message !== undefined;
  if (!hasText && typeof body.published !== "boolean" && !hasSchedule && !files.length && !removeIds.length) {
    return responseError("ไม่มีข้อมูลสำหรับบันทึก");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM school_announcements WHERE id=? FOR UPDATE",
      [id],
    );
    if (!existingRows.length) {
      await connection.rollback();
      return responseError("ไม่พบประกาศ", 404);
    }
    if (capabilities.attachments) {
      const [countRows] = await connection.execute<RowDataPacket[]>(
        "SELECT COUNT(*) total FROM school_announcement_attachments WHERE announcement_id=?",
        [id],
      );
      const [removableRows] = removeIds.length
        ? await connection.execute<RowDataPacket[]>(
            `SELECT id FROM school_announcement_attachments WHERE announcement_id=? AND id IN (${removeIds.map(() => "?").join(",")})`,
            [id, ...removeIds],
          )
        : [[]];
      const remaining = Number(countRows[0]?.total ?? 0) - removableRows.length + attachments.length;
      if (remaining > MAX_ANNOUNCEMENT_ATTACHMENTS) {
        await connection.rollback();
        return responseError(`แนบไฟล์ได้ไม่เกิน ${MAX_ANNOUNCEMENT_ATTACHMENTS} ไฟล์`);
      }
      if (removeIds.length) {
        await connection.execute(
          `DELETE FROM school_announcement_attachments WHERE announcement_id=? AND id IN (${removeIds.map(() => "?").join(",")})`,
          [id, ...removeIds],
        );
      }
    }

    const assignments: string[] = [];
    const values: Array<string | number | null> = [];
    if (body.title !== undefined) {
      assignments.push("title=?");
      values.push(String(body.title).trim());
    }
    if (body.message !== undefined) {
      assignments.push("message=?");
      values.push(String(body.message).trim());
    }
    if (hasSchedule && body.published !== false) {
      assignments.push("is_published=1");
      if (capabilities.scheduling) {
        assignments.push("publish_at=?");
        values.push(scheduleValue!.sqlValue);
      }
    } else if (typeof body.published === "boolean") {
      assignments.push("is_published=?");
      values.push(body.published ? 1 : 0);
      if (capabilities.scheduling) {
        assignments.push("publish_at=?");
        values.push(null);
      }
    }
    if (assignments.length) {
      await connection.execute(
        `UPDATE school_announcements SET ${assignments.join(",")} WHERE id=?`,
        [...values, id],
      );
    }
    for (const attachment of attachments) {
      await connection.execute(
        "INSERT INTO school_announcement_attachments (announcement_id,file_name,mime_type,file_size,file_data) VALUES(?,?,?,?,?)",
        [id, attachment.name, attachment.mime, attachment.size, attachment.data],
      );
    }
    await connection.commit();
  } catch {
    await connection.rollback();
    return responseError("แก้ไขประกาศไม่สำเร็จ กรุณาลองใหม่", 500);
  } finally {
    connection.release();
  }
  return listingResponse();
}

async function deleteHandler(request: Request) {
  if (!(await getAdminSession())) return responseError("ไม่มีสิทธิ์ใช้งาน", 401);
  const rejected = checkMutationRequest(request, ["application/json"]);
  if (rejected) return rejected;
  let body: MutationBody;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return responseError("ข้อมูลไม่ถูกต้อง");
    body = parsed as MutationBody;
  } catch {
    return responseError("ข้อมูล JSON ไม่ถูกต้อง");
  }
  const id = parseId(body.id);
  if (!id) return responseError("ข้อมูลไม่ถูกต้อง");
  const [result] = await db.execute<ResultSetHeader>(
    "DELETE FROM school_announcements WHERE id=?",
    [id],
  );
  if (!result.affectedRows) return responseError("ไม่พบประกาศ", 404);
  return listingResponse();
}





export async function GET(request: Request) {
  try { return await getHandler(request); }
  catch { return responseError("โหลดประกาศไม่สำเร็จ กรุณาลองใหม่", 500); }
}
export async function POST(request: Request) {
  try { return await postHandler(request); }
  catch { return responseError("บันทึกประกาศไม่สำเร็จ กรุณาลองใหม่", 500); }
}
export async function PATCH(request: Request) {
  try { return await patchHandler(request); }
  catch { return responseError("แก้ไขประกาศไม่สำเร็จ กรุณาลองใหม่", 500); }
}
export async function DELETE(request: Request) {
  try { return await deleteHandler(request); }
  catch { return responseError("ลบประกาศไม่สำเร็จ กรุณาลองใหม่", 500); }
}
