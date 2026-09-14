import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import mysql from 'mysql2/promise';
const enabled = process.env.RUN_STUDENT_INTEGRATION === '1';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
function cookie(id, role = 'student') {
  const payload = Buffer.from(JSON.stringify({ id, role, name: 'Integration', exp: Date.now()+120000 })).toString('base64url');
  return `school_os_session=${payload}.${createHmac('sha256',process.env.AUTH_SECRET).update(payload).digest('base64url')}`;
}
test('multiple attachment upload, ownership, download, legacy and notification validation', { skip: !enabled }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  const db = await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:url.pathname.slice(1),ssl:{rejectUnauthorized:true}});
  let reportId;
  try {
    const [[student]] = await db.query("SELECT st.id,sb.id subjectId FROM students st JOIN subjects sb ON sb.classroom_id=st.class_id WHERE st.status='ACTIVE' LIMIT 1");
    assert.ok(student);
    const headers = { cookie: cookie(student.id) };
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
    assert.equal((await fetch(path,{headers:{cookie:cookie(student.id+1000000)}})).status,404);
    assert.equal((await fetch(`${path}?id=${items[0].id}`,{headers:{cookie:cookie(student.id+1000000)}})).status,404);
    assert.equal((await fetch(path,{headers:{cookie:cookie(student.id,'teacher')}})).status,401);
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
    await db.end();
  }
});
