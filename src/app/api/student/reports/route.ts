import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
const allowed = [
  "สแกนสำเร็จแต่สถานะเป็นขาด",
  "สแกนไม่ติด",
  "ไม่พบใบหน้า",
  "ระบบไม่เปิดกล้อง",
  "เช็คชื่อผิดเวลา",
  "อื่น ๆ",
];
export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
  const form = await request.formData(),
    subjectId = Number(form.get("subjectId")),
    incidentDate = String(form.get("incidentDate") || ""),
    classTime = String(form.get("classTime") || ""),
    room = String(form.get("room") || "").trim(),
    issueType = String(form.get("issueType") || ""),
    details = String(form.get("details") || "").trim(),
    attachment = form.get("attachment");
  if (
    !Number.isInteger(subjectId) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(classTime) ||
    !room ||
    room.length > 150 ||
    !allowed.includes(issueType) ||
    details.length < 10 ||
    details.length > 3000
  )
    return Response.json(
      { message: "กรุณากรอกข้อมูลปัญหาให้ครบและถูกต้อง" },
      { status: 400 },
    );
  const [subjects] = await db.execute<RowDataPacket[]>(
    `SELECT sb.id FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id WHERE sb.id=? AND st.id=? AND st.status='ACTIVE' LIMIT 1`,
    [subjectId, student.id],
  );
  if (!subjects.length)
    return Response.json(
      { message: "รายวิชานี้ไม่อยู่ในห้องเรียนของคุณ" },
      { status: 403 },
    );
  let data: Buffer | null = null,
    mime: string | null = null;
  if (attachment instanceof File && attachment.size) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(attachment.type) ||
      attachment.size > 5 * 1024 * 1024
    )
      return Response.json(
        { message: "รูปแนบต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" },
        { status: 400 },
      );
    data = Buffer.from(await attachment.arrayBuffer());
    mime = attachment.type;
  }
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO attendance_issue_reports(student_id,subject_id,incident_date,class_time,room,issue_type,details,attachment_data,attachment_mime) VALUES(?,?,?,?,?,?,?,?,?)`,
    [
      student.id,
      subjectId,
      incidentDate,
      classTime,
      room,
      issueType,
      details,
      data,
      mime,
    ],
  );
  return Response.json(
    { id: result.insertId, message: "ส่งคำร้องเรียบร้อยแล้ว" },
    { status: 201 },
  );
}
