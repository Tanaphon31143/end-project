import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';
import { createTestSession, firstActiveAccount } from './helpers/session.mjs';
const enabled = process.env.RUN_STUDENT_INTEGRATION === '1';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
test('multiple attachment upload, ownership, download, legacy and notification validation', { skip: !enabled }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  const db = await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true}});
  let reportId;
  const sessions = [];
  const sessionFor = async (account) => {
    const session = await createTestSession(db, account);
    sessions.push(session);
    return session.cookie;
  };
  try {
    const [[student]] = await db.query("SELECT st.id,sb.id subjectId FROM subjects sb JOIN student_term_enrollments ste ON ste.classroom_id=sb.classroom_id AND ste.academic_year=sb.academic_year AND ste.semester=sb.semester JOIN students st ON st.id=ste.student_id WHERE st.status='ACTIVE' AND st.must_change_password=0 LIMIT 1");
    assert.ok(student);
    const [[owner]] = await db.query("SELECT id,full_name name,email FROM students WHERE id=?",[student.id]);
    const headers = { cookie: await sessionFor({ ...owner, role: 'student' }) };
    const otherStudent = await firstActiveAccount(db, 'student', `a.id<>${Number(student.id)} AND a.must_change_password=0`);
    const teacher = await firstActiveAccount(db, 'teacher');
    assert.ok(otherStudent && teacher, 'ต้องมีนักเรียนอีกคนและครูหนึ่งคนสำหรับทดสอบสิทธิ์');
    const otherCookie = await sessionFor(otherStudent);
    const teacherCookie = await sessionFor(teacher);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZQAAAABJRU5ErkJggg==','base64');
    const form = new FormData();
    for (const [key,value] of Object.entries({subjectId:String(student.subjectId),incidentDate:'2026-09-10',classTime:'08:30',room:'Test',issueType:'อื่น ๆ',details:'Integration test temporary report'})) form.set(key,value);
    form.append('attachments',new Blob([png],{type:'image/png'}),'one.png');
    form.append('attachments',new Blob([png],{type:'image/png'}),'two.png');
    const created = await fetch(`${base}/api/student/reports`, {method:'POST',headers,body:form});
    assert.equal(created.status,201,await created.clone().text());
    reportId=(await created.json()).id;
    const path=`${base}/api/student/reports/${reportId}/attachments`;
    const list = await fetch(path,{headers}); assert.equal(list.status,200);
    const items=(await list.json()).attachments; assert.equal(items.length,2);
    const download=await fetch(`${path}?id=${items[0].id}&download=1`,{headers});
    assert.equal(download.status,200); assert.match(download.headers.get('content-disposition'),/^attachment/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()),png);
    assert.equal((await fetch(path)).status,401);
    // Another student must not learn that the report exists; a teacher session is the wrong role.
    assert.equal((await fetch(path,{headers:{cookie:otherCookie}})).status,404);
    assert.equal((await fetch(`${path}?id=${items[0].id}`,{headers:{cookie:otherCookie}})).status,404);
    assert.equal((await fetch(path,{headers:{cookie:teacherCookie}})).status,401);
    await db.execute('UPDATE attendance_issue_reports SET attachment_data=?,attachment_mime=? WHERE id=?',[png,'image/png',reportId]);
    assert.equal((await fetch(`${path}?id=legacy`,{headers})).status,200);
    const bad=await fetch(`${base}/api/student/notifications`,{method:'PATCH',headers:{...headers,'Content-Type':'application/json'},body:'{}'});
    assert.equal(bad.status,400);
    await db.execute("UPDATE attendance_issue_reports SET status='COMPLETED',resolution='ตรวจสอบคำร้องทดสอบแล้ว' WHERE id=?",[reportId]);
    const notices=await fetch(`${base}/api/student/notifications`,{headers});
    assert.equal(notices.status,200,await notices.clone().text());
    const first=await notices.json();
    const [[event]]=await db.query("SELECT COUNT(*) total FROM notifications WHERE user_id=? AND related_entity_type='attendance_issue' AND related_entity_id=? AND type='ISSUE_RESOLVED'",[student.id,String(reportId)]);
    assert.equal(Number(event.total),1);
    await Promise.all([fetch(`${base}/api/student/notifications`,{headers}),fetch(`${base}/api/student/notifications`,{headers})]);
    const second=await (await fetch(`${base}/api/student/notifications`,{headers})).json();
    assert.equal(second.pagination.total,first.pagination.total);
  } finally {
    if (reportId) {
      await db.execute("DELETE FROM notifications WHERE related_entity_type='attendance_issue' AND related_entity_id=?",[String(reportId)]);
      await db.execute('DELETE FROM attendance_issue_attachments WHERE report_id=?',[reportId]);
      await db.execute('DELETE FROM attendance_issue_reports WHERE id=?',[reportId]);
    }
    for (const session of sessions) await session.revoke();
    await db.end();
  }
});
