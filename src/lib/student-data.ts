import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

export type StudentDashboardData = {
  student: { id:number; name:string; code:string; className:string; classLevel:string; classId:number|null; faceReady:boolean };
  term: { semester:number; academicYear:string };
  stats: { subjects:number; present:number; late:number; absent:number; leave:number; total:number; rate:number };
  today: Array<{ id:number; code:string; name:string; teacher:string; room:string; startTime:string; endTime:string }>;
  recent: Array<{ id:number; date:string; subject:string; checkIn:string; status:"มาเรียน"|"สาย"|"ขาด"|"ลา" }>;
};

type StudentRow=RowDataPacket&{id:number;name:string;code:string;className:string;classLevel:string;classId:number|null;faceReady:number};
type CountRow=RowDataPacket&{subjects:number;present:number;late:number;absent:number;leaveCount:number;total:number};

export async function getStudentDashboardData(studentId:number):Promise<StudentDashboardData|null>{
  const [[students],[settings],[counts],[today],[recent]]=await Promise.all([
    db.execute<StudentRow[]>(`SELECT s.id,s.full_name name,s.student_code code,s.class_id classId,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,EXISTS(SELECT 1 FROM face_data f WHERE f.student_id=s.id AND f.status='READY') faceReady FROM students s LEFT JOIN classrooms c ON c.id=s.class_id WHERE s.id=? AND s.status='ACTIVE' LIMIT 1`,[studentId]),
    db.execute<(RowDataPacket&{semester:number;academicYear:string})[]>(`SELECT semester,academic_year academicYear FROM school_settings ORDER BY id LIMIT 1`),
    db.execute<CountRow[]>(`SELECT (SELECT COUNT(*) FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id WHERE st.id=? AND sb.is_active=1) subjects,SUM(a.status='PRESENT') present,SUM(a.status='LATE') late,SUM(a.status='ABSENT') absent,SUM(a.status='LEAVE') leaveCount,COUNT(a.id) total FROM attendance_records a WHERE a.student_id=?`,[studentId,studentId]),
    db.execute<(RowDataPacket&{id:number;code:string;name:string;teacher:string;room:string;startTime:string;endTime:string})[]>(`SELECT sb.id,sb.subject_code code,sb.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--') startTime,COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--') endTime FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id LEFT JOIN classrooms c ON c.id=sb.classroom_id WHERE st.id=? AND sb.is_active=1 AND (sb.study_days IS NULL OR sb.study_days='' OR FIND_IN_SET(ELT(WEEKDAY(CURRENT_DATE)+1,'จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'),sb.study_days)) ORDER BY sb.start_time LIMIT 6`,[studentId]),
    db.execute<(RowDataPacket&{id:number;date:string;subject:string;checkIn:string;status:"มาเรียน"|"สาย"|"ขาด"|"ลา"})[]>(`SELECT a.id,DATE_FORMAT(a.attendance_date,'%d/%m/%Y') date,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subject,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') checkIn,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status FROM attendance_records a LEFT JOIN subjects sb ON sb.id=a.subject_id WHERE a.student_id=? ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 5`,[studentId]),
  ]);
  const student=students[0];if(!student)return null;const raw=counts[0]||{subjects:0,present:0,late:0,absent:0,leaveCount:0,total:0};
  return{student:{...student,faceReady:Boolean(student.faceReady)},term:settings[0]||{semester:1,academicYear:"2569"},stats:{subjects:Number(raw.subjects)||0,present:Number(raw.present)||0,late:Number(raw.late)||0,absent:Number(raw.absent)||0,leave:Number(raw.leaveCount)||0,total:Number(raw.total)||0,rate:raw.total?Number((((Number(raw.present)||0)+(Number(raw.late)||0))*100/Number(raw.total)).toFixed(1)):0},today,recent};
}
