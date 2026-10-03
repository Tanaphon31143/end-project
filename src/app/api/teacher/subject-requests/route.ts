import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { requireTeacher } from "@/lib/api-auth";
import { protectTeacherMutation } from "@/lib/api-security";
import { db } from "@/lib/db";
import {
  getTeacherSubjectRequests,
  parseSubjectRequestInput,
} from "@/lib/subject-requests";

export const runtime = "nodejs";
export async function GET() {
  const auth = await requireTeacher();
  if (auth.error) return auth.error;
  return NextResponse.json({
    requests: await getTeacherSubjectRequests(auth.teacher.id),
  });
}

async function save(request: Request, editing: boolean) {
  const auth = await requireTeacher();
  if (auth.error) return auth.error;
  const protection = protectTeacherMutation(
    request,
    auth.teacher.id,
    "subject-request",
    12,
  );
  if (protection) return protection;
  const body = await request.json().catch(() => null);
  let input;
  try {
    input = parseSubjectRequestInput(body);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  const requestId = Number(body?.requestId);
  if (editing && (!Number.isSafeInteger(requestId) || requestId < 1))
    return NextResponse.json(
      { message: "ไม่พบคำขอที่ต้องการแก้ไข" },
      { status: 400 },
    );
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (editing) {
      const [rows] = await connection.execute<
        (RowDataPacket & { status: string })[]
      >(
        "SELECT status FROM teacher_subject_requests WHERE id=? AND teacher_id=? FOR UPDATE",
        [requestId, auth.teacher.id],
      );
      if (!rows[0]) {
        await connection.rollback();
        return NextResponse.json(
          { message: "ไม่พบคำขอของคุณ" },
          { status: 404 },
        );
      }
      if (!["REJECTED", "CHANGES_REQUESTED"].includes(rows[0].status)) {
        await connection.rollback();
        return NextResponse.json(
          { message: "แก้ไขได้เฉพาะคำขอที่ไม่อนุมัติหรือขอแก้ไขข้อมูล" },
          { status: 409 },
        );
      }
    }
    const [classrooms] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM classrooms WHERE id=?",
      [input.classroomId],
    );
    if (!classrooms.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "ไม่พบห้องเรียนที่เลือก" },
        { status: 400 },
      );
    }
    const [subjects] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM subjects WHERE subject_code=? LIMIT 1",
      [input.subjectCode],
    );
    if (subjects.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "รหัสวิชานี้มีอยู่ในระบบแล้ว" },
        { status: 409 },
      );
    }
    const [pending] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM teacher_subject_requests WHERE subject_code=? AND status='PENDING' AND id<>? LIMIT 1",
      [input.subjectCode, editing ? requestId : 0],
    );
    if (pending.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "รหัสวิชานี้มีคำขอที่รออนุมัติแล้ว" },
        { status: 409 },
      );
    }
    if (editing) {
      await connection.execute(
        "UPDATE teacher_subject_requests SET classroom_id=?,subject_name=?,subject_code=?,semester=?,academic_year=?,description=?,schedules_json=?,status='PENDING',reviewed_by_admin_id=NULL,reviewed_at=NULL WHERE id=? AND teacher_id=?",
        [
          input.classroomId,
          input.subjectName,
          input.subjectCode,
          input.semester,
          input.academicYear,
          input.description || null,
          JSON.stringify(input.schedules),
          requestId,
          auth.teacher.id,
        ],
      );
    } else {
      await connection.execute<ResultSetHeader>(
        "INSERT INTO teacher_subject_requests (teacher_id,classroom_id,subject_name,subject_code,semester,academic_year,description,schedules_json) VALUES (?,?,?,?,?,?,?,?)",
        [
          auth.teacher.id,
          input.classroomId,
          input.subjectName,
          input.subjectCode,
          input.semester,
          input.academicYear,
          input.description || null,
          JSON.stringify(input.schedules),
        ],
      );
    }
    await connection.commit();
    return NextResponse.json(
      { message: editing ? "ส่งคำขออีกครั้งแล้ว" : "ส่งคำขอรายวิชาแล้ว" },
      { status: editing ? 200 : 201 },
    );
  } catch (error) {
    await connection.rollback();
    console.error("Unable to save teacher subject request", error);
    return NextResponse.json(
      { message: "บันทึกคำขอไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PATCH(request: Request) {
  return save(request, true);
}
