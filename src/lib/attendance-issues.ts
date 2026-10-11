import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

export type AttendanceIssue = {
  id: number; studentName: string; studentCode: string; subjectName: string;
  incidentDate: string; classTime: string; room: string; issueType: string;
  details: string; status: "PENDING" | "REVIEWING" | "COMPLETED" | "REJECTED";
  resolution: string; updatedAt: string;
};
export async function getAttendanceIssues(teacherId?: number) {
  const [rows] = await db.execute<(RowDataPacket & AttendanceIssue)[]>(
    `SELECT r.id,st.full_name studentName,st.student_code studentCode,COALESCE(s.subject_name,'ไม่ระบุรายวิชา') subjectName,DATE_FORMAT(r.incident_date,'%Y-%m-%d') incidentDate,TIME_FORMAT(r.class_time,'%H:%i') classTime,r.room,r.issue_type issueType,r.details,r.status,COALESCE(r.resolution,'') resolution,DATE_FORMAT(r.updated_at,'%Y-%m-%d %H:%i:%s') updatedAt FROM attendance_issue_reports r JOIN students st ON st.id=r.student_id LEFT JOIN subjects s ON s.id=r.subject_id ${teacherId === undefined ? "" : "WHERE s.teacher_id=?"} ORDER BY r.created_at DESC,r.id DESC LIMIT 100`, teacherId === undefined ? [] : [teacherId]);
  return rows;
}
