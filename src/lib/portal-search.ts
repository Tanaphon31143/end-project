import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "./db";
import type { AppSession } from "./auth";

export async function searchPortal(session: AppSession, query: string) {
  const needle = `%${query.replace(/[!%_]/g, "!$&")}%`;
  const teacher = session.role === "teacher";
  const [students, subjects, teachers, classes] = await Promise.all([
    db.execute<RowDataPacket[]>(`SELECT s.id, s.full_name title, s.student_code code, c.name classroom,
      ${teacher ? "(SELECT MIN(id) FROM subjects WHERE teacher_id=? AND is_active=1 AND classroom_id=s.class_id)" : "NULL"} courseId
      FROM students s LEFT JOIN classrooms c ON c.id=s.class_id
      WHERE (s.full_name LIKE ? ESCAPE '!' OR s.student_code LIKE ? ESCAPE '!')
      ${teacher ? "AND s.status='ACTIVE' AND EXISTS(SELECT 1 FROM subjects sub WHERE sub.teacher_id=? AND sub.is_active=1 AND sub.classroom_id=s.class_id)" : ""}
      ORDER BY s.full_name, s.id LIMIT 8`, teacher ? [session.id, needle, needle, session.id] : [needle, needle]),
    db.execute<RowDataPacket[]>(`SELECT id,subject_name title,subject_code code FROM subjects
      WHERE (subject_name LIKE ? ESCAPE '!' OR subject_code LIKE ? ESCAPE '!')
      ${teacher ? "AND teacher_id=? AND is_active=1" : ""} ORDER BY subject_name,id LIMIT 8`, teacher ? [needle, needle, session.id] : [needle, needle]),
    teacher ? Promise.resolve([[]]) : db.execute<RowDataPacket[]>("SELECT id,full_name title,teacher_code code FROM teachers WHERE full_name LIKE ? ESCAPE '!' OR teacher_code LIKE ? ESCAPE '!' ORDER BY full_name,id LIMIT 6", [needle, needle]),
    teacher ? Promise.resolve([[]]) : db.execute<RowDataPacket[]>("SELECT id,name title,level code FROM classrooms WHERE name LIKE ? ESCAPE '!' OR level LIKE ? ESCAPE '!' ORDER BY name,id LIMIT 6", [needle, needle]),
  ]);
  return [
    ...students[0].map((r) => ({ id: `student:${r.id}`, title: r.title, detail: `นักเรียน · ${r.code} · ${r.classroom || 'ยังไม่ระบุห้อง'}`, href: teacher ? `/teacher/courses/${r.courseId}/students#student-${r.id}` : `/admin/search?q=${encodeURIComponent(query)}#student-${r.id}` })),
    ...subjects[0].map((r) => ({ id: `subject:${r.id}`, title: r.title, detail: `รายวิชา · ${r.code}`, href: teacher ? `/teacher/courses/${r.id}/students` : `/admin/search?q=${encodeURIComponent(query)}#subject-${r.id}` })),
    ...teachers[0].map((r) => ({ id: `teacher:${r.id}`, title: r.title, detail: `ครู · ${r.code || ''}`, href: `/admin/search?q=${encodeURIComponent(query)}#teacher-${r.id}` })),
    ...classes[0].map((r) => ({ id: `classroom:${r.id}`, title: r.title, detail: `ชั้นเรียน · ${r.code}`, href: `/admin/classes/${r.id}` })),
  ];
}
