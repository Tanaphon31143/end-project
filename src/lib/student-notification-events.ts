import 'server-only';
import { db } from './db';

/** Materialize current student events at polling time. Unique keys make concurrent polls idempotent.
 * This covers both the teacher Prisma routes and the admin SQL routes using their committed data.
 */
export async function syncStudentNotificationEvents(studentId: number) {
  await db.execute(`INSERT INTO notifications
    (user_id,user_role,type,title,message,related_entity_type,related_entity_id,action_url,event_key)
    SELECT ?, 'student', e.type, e.title, e.message, e.entity, e.entityId, e.url, e.eventKey
    FROM (
      SELECT 'SESSION_OPENED' type, 'เปิดคาบเช็คชื่อ' title,
        CONCAT(sb.subject_code, ' ', sb.subject_name, ' เวลา ', TIME_FORMAT(cs.start_time,'%H:%i'), '–', TIME_FORMAT(cs.end_time,'%H:%i')) message,
        'check_in_session' entity, CAST(cs.id AS CHAR) entityId,
        CONCAT('/student/attendance/scan?sessionId=',cs.id) url,
        CONCAT('session:',cs.id) eventKey
      FROM check_in_sessions cs JOIN subjects sb ON sb.id=cs.subject_id
      JOIN students st ON st.class_id=cs.classroom_id
      WHERE st.id=? AND st.status='ACTIVE' AND cs.status='ACTIVE'
        AND cs.session_date=DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)
        AND TIME(UTC_TIMESTAMP()+INTERVAL 7 HOUR) BETWEEN cs.start_time AND cs.end_time
      UNION ALL
      SELECT CASE a.status WHEN 'PRESENT' THEN 'ATTENDANCE_SUCCESS' WHEN 'LATE' THEN 'ATTENDANCE_LATE' ELSE 'ATTENDANCE_ABSENT' END,
        CASE a.status WHEN 'PRESENT' THEN 'เช็คชื่อสำเร็จ' WHEN 'LATE' THEN 'เช็คชื่อสาย' ELSE 'บันทึกขาดเรียน' END,
        CONCAT(COALESCE(sb.subject_name,'การเข้าเรียน'), ' วันที่ ', DATE_FORMAT(a.attendance_date,'%d/%m/%Y')),
        'attendance_record', CAST(a.id AS CHAR), '/student/attendance/history', CONCAT('attendance:',a.id,':',a.status)
      FROM attendance_records a LEFT JOIN subjects sb ON sb.id=a.subject_id
      WHERE a.student_id=? AND a.status IN ('PRESENT','LATE','ABSENT') AND a.attendance_date>=CURRENT_DATE-INTERVAL 30 DAY
      UNION ALL
      SELECT 'ISSUE_RESOLVED', 'ผลการตรวจสอบคำร้อง',
        CONCAT('คำร้อง #',r.id,': ',COALESCE(NULLIF(r.resolution,''),CASE r.status WHEN 'COMPLETED' THEN 'ตรวจสอบเสร็จแล้ว' ELSE 'คำร้องถูกปฏิเสธ' END)),
        'attendance_issue', CAST(r.id AS CHAR), '/student/attendance/report', CONCAT('issue:',r.id,':',r.status,':',UNIX_TIMESTAMP(r.updated_at))
      FROM attendance_issue_reports r WHERE r.student_id=? AND r.status IN ('COMPLETED','REJECTED')
        AND r.updated_at>=NOW()-INTERVAL 30 DAY
      UNION ALL
      SELECT CASE p.status WHEN 'APPROVED' THEN 'REQUEST_APPROVED' ELSE 'REQUEST_REJECTED' END,
        'ผลคำร้องแก้ไขข้อมูล', CONCAT('คำร้อง #',p.id,': ',CASE p.status WHEN 'APPROVED' THEN 'ได้รับอนุมัติ' ELSE 'ถูกปฏิเสธ' END),
        'profile_edit_request', CAST(p.id AS CHAR), '/student/profile', CONCAT('profile:',p.id,':',p.status)
      FROM profile_edit_requests p WHERE p.student_id=? AND p.status IN ('APPROVED','REJECTED')
        AND p.updated_at>=NOW()-INTERVAL 30 DAY
      UNION ALL
      SELECT 'COURSE_UPDATED', 'รายวิชามีการเปลี่ยนแปลง', CONCAT(sb.subject_code,' ',sb.subject_name),
        'subject', CAST(sb.id AS CHAR), CONCAT('/student/courses/',sb.id), CONCAT('course-audit:',al.log_id)
      FROM audit_logs al JOIN subjects sb ON CAST(sb.id AS CHAR) COLLATE utf8mb4_unicode_ci=al.entity_id COLLATE utf8mb4_unicode_ci
      JOIN students st ON st.class_id=sb.classroom_id
      WHERE st.id=? AND al.entity='subject' AND al.action='UPDATE' AND al.created_at>=NOW()-INTERVAL 30 DAY
      UNION ALL
      SELECT 'COURSE_UPDATED', 'คาบเรียนมีการเปลี่ยนแปลง', CONCAT(sb.subject_code,' ปิดรอบเช็คชื่อแล้ว'),
        'check_in_session', CAST(cs.id AS CHAR), CONCAT('/student/courses/',sb.id), CONCAT('session-closed:',cs.id)
      FROM check_in_sessions cs JOIN subjects sb ON sb.id=cs.subject_id JOIN students st ON st.class_id=cs.classroom_id
      WHERE st.id=? AND cs.status='CLOSED' AND cs.session_date=DATE(UTC_TIMESTAMP()+INTERVAL 7 HOUR)
    ) e
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n WHERE n.user_id=? AND n.user_role='student'
        AND n.type COLLATE utf8mb4_unicode_ci=e.type COLLATE utf8mb4_unicode_ci
        AND n.related_entity_type COLLATE utf8mb4_unicode_ci=e.entity COLLATE utf8mb4_unicode_ci
        AND n.related_entity_id COLLATE utf8mb4_unicode_ci=e.entityId COLLATE utf8mb4_unicode_ci
        AND (n.event_key COLLATE utf8mb4_unicode_ci=e.eventKey COLLATE utf8mb4_unicode_ci OR n.event_key IS NULL)
    )
    ON DUPLICATE KEY UPDATE id=id`,
    [studentId, studentId, studentId, studentId, studentId, studentId, studentId, studentId]);
}
