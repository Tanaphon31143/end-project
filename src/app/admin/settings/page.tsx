import { SettingsForm } from "@/components/admin/SettingsForm";
import "./settings.css";
import{db}from"@/lib/db";import type{RowDataPacket}from"mysql2";export const dynamic="force-dynamic";export default async function SettingsPage() {
  const[settingsRows]=await db.execute<(RowDataPacket&{schoolName:string;academicYear:string;semester:number;schoolStartTime:string;lateAfter:string;faceRecognitionEnabled:number;notificationsEnabled:number;updatedAt:string})[]>(`SELECT school_name schoolName,academic_year academicYear,semester,TIME_FORMAT(school_start_time,'%H:%i') schoolStartTime,TIME_FORMAT(late_after,'%H:%i') lateAfter,face_recognition_enabled faceRecognitionEnabled,notifications_enabled notificationsEnabled,DATE_FORMAT(updated_at,'%d/%m/%Y %H:%i') updatedAt FROM school_settings ORDER BY id LIMIT 1`);const settings=settingsRows[0];
  const[activity]=await db.execute<(RowDataPacket&{label:string;detail:string;createdAt:string})[]>(`SELECT 'บันทึกการเข้าเรียน' label,CONCAT(st.full_name,' · ',a.status) detail,DATE_FORMAT(a.created_at,'%d/%m/%Y %H:%i') createdAt FROM attendance_records a JOIN students st ON st.id=a.student_id ORDER BY a.created_at DESC LIMIT 20`);
  return (
    <main className="admin-content">
      <div className="page-intro"><div><h2>การตั้งค่าระบบ</h2><p>กำหนดค่าพื้นฐานและการทำงานของระบบ</p></div></div>
      <SettingsForm initialSettings={{...settings,faceRecognitionEnabled:Boolean(settings.faceRecognitionEnabled),notificationsEnabled:Boolean(settings.notificationsEnabled)}} initialActivity={activity}/>
    </main>
  );
}
