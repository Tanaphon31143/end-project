import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, validateIssueImage } from "@/lib/issue-attachment-rules.mjs";
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
    attachments = [...form.getAll("attachments"), ...form.getAll("attachment")]
      .filter((file): file is File => file instanceof File && file.size > 0);
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
  if (attachments.length > MAX_ATTACHMENTS || attachments.some(file => file.size > MAX_ATTACHMENT_BYTES))
    return Response.json({ message: "แนบได้สูงสุด 5 รูป รูปละไม่เกิน 5 MB" }, { status: 400 });
  const images = [];
  for (const file of attachments) {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!validateIssueImage(file.type, bytes))
      return Response.json({ message: "ไฟล์ต้องเป็นภาพ JPG, PNG หรือ WebP ที่ถูกต้อง" }, { status: 400 });
    images.push({ file, bytes });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO attendance_issue_reports(student_id,subject_id,incident_date,class_time,room,issue_type,details) VALUES(?,?,?,?,?,?,?)`,
      [student.id, subjectId, incidentDate, classTime, room, issueType, details],
    );
    for (const { file, bytes } of images) {
      await connection.execute(
        'INSERT INTO attendance_issue_attachments(report_id,file_name,image_mime,image_data) VALUES(?,?,?,?)',
        [result.insertId, file.name.slice(0, 255), file.type, bytes],
      );
    }
    await connection.commit();
    return Response.json({ id: result.insertId, message: "ส่งคำร้องเรียบร้อยแล้ว" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    console.error('Issue submission failed', error);
    return Response.json({ message: "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  } finally { connection.release(); }
}
