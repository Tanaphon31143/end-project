import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
async function admin() {
  return Boolean(await getAdminSession());
}
export async function GET(r: Request) {
  if (!(await admin()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const action = new URL(r.url).searchParams.get("action");
  if (action === "backup") {
    const names = [
        "admins",
        "teachers",
        "students",
        "classrooms",
        "subjects",
        "face_data",
        "attendance_records",
        "school_settings",
      ],
      data: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const name of names) {
      const [result] = await db.query(`SELECT * FROM \`${name}\``);
      data[name] = result;
    }
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=school-backup-${new Date().toISOString().slice(0, 10)}.json`,
      },
    });
  }
  const [settings] = await db.execute<
    (RowDataPacket & {
      schoolName: string;
      academicYear: string;
      semester: number;
      schoolStartTime: string;
      lateAfter: string;
      faceRecognitionEnabled: number;
      notificationsEnabled: number;
      updatedAt: string;
    })[]
  >(
    `SELECT school_name schoolName,academic_year academicYear,semester,TIME_FORMAT(school_start_time,'%H:%i') schoolStartTime,TIME_FORMAT(late_after,'%H:%i') lateAfter,face_recognition_enabled faceRecognitionEnabled,notifications_enabled notificationsEnabled,DATE_FORMAT(updated_at,'%d/%m/%Y %H:%i') updatedAt FROM school_settings ORDER BY id LIMIT 1`,
  );
  const [activity] = await db.execute<
    (RowDataPacket & { label: string; detail: string; createdAt: string })[]
  >(
    `SELECT 'บันทึกการเข้าเรียน' label,CONCAT(st.full_name,' · ',a.status) detail,DATE_FORMAT(a.created_at,'%d/%m/%Y %H:%i') createdAt FROM attendance_records a JOIN students st ON st.id=a.student_id UNION ALL SELECT 'ลงทะเบียนข้อมูลใบหน้า',st.full_name,DATE_FORMAT(f.updated_at,'%d/%m/%Y %H:%i') FROM face_data f JOIN students st ON st.id=f.student_id ORDER BY createdAt DESC LIMIT 20`,
  );
  return Response.json({ settings: settings[0], activity });
}
export async function PUT(r: Request) {
  if (!(await admin()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const b = await r.json();
  const schoolName = String(b.schoolName || "").trim(),
    academicYear = String(b.academicYear || "").trim(),
    semester = Number(b.semester),
    start = String(b.schoolStartTime || ""),
    late = String(b.lateAfter || "");
  if (
    !schoolName ||
    !academicYear ||
    ![1, 2].includes(semester) ||
    !start ||
    !late
  )
    return Response.json(
      { message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" },
      { status: 400 },
    );
  await db.execute(
    `UPDATE school_settings SET school_name=?,academic_year=?,semester=?,school_start_time=?,late_after=?,face_recognition_enabled=?,notifications_enabled=? ORDER BY id LIMIT 1`,
    [
      schoolName,
      academicYear,
      semester,
      start,
      late,
      b.faceRecognitionEnabled ? 1 : 0,
      b.notificationsEnabled ? 1 : 0,
    ],
  );
  return Response.json({ message: "บันทึกการตั้งค่าสำเร็จ" });
}
