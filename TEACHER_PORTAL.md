# Teacher Portal

## หน้าจอ

- `src/app/teacher/layout.tsx` — ตรวจ role ครูและครอบทุกหน้าด้วย Sidebar/Topbar
- `src/app/teacher/dashboard/page.tsx` — สรุปข้อมูลจริงของวันนี้ รอบล่าสุด และกราฟ 6 วันทำการ
- `src/app/teacher/courses/page.tsx` — รายวิชาจริงของครูและฟอร์มสร้างรอบเช็คชื่อ
- `src/app/teacher/scan/[sessionId]/page.tsx` — กล้องจริง ผลรู้จำ การยืนยัน และตาราง polling แบบเรียลไทม์
- `src/app/teacher/history/page.tsx` — ตัวกรองและประวัติราย session
- `src/app/teacher/reports/page.tsx` — รายงานรายวัน/สัปดาห์/เดือน
- `src/app/teacher/profile/page.tsx` — ข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน

## Components

- `TeacherShell.tsx`, `Sidebar.tsx` — layout responsive และเมนู mobile
- `StatCard.tsx`, `CourseCard.tsx` — การ์ดที่นำกลับมาใช้ซ้ำได้
- `AttendanceChart.tsx` — กราฟ Recharts สามสถานะจากข้อมูลจริง
- `CoursesClient.tsx` — จัดการฟอร์มสร้างรอบและสถานะบันทึก
- `LiveScanFeed.tsx` — กล้อง การรู้จำใบหน้า การยืนยัน และ polling ทุก 3 วินาที
- `AttendanceDetailClient.tsx` — แก้สถานะนักเรียนรายคนพร้อมเหตุผลและสถานะกำลังบันทึก
- `ReportsClient.tsx` — สร้างรายงานและส่งออก Excel/PDF ฝั่งเบราว์เซอร์

## API และความปลอดภัย

- `src/lib/auth.ts` และ `src/lib/api-auth.ts` — อ่าน session, บังคับ role teacher และใช้ `teachers.id` จาก session โดยตรง
- `POST /api/teacher/sessions` — สร้าง attendance session หลังตรวจ ownership
- `PATCH /api/teacher/sessions` — ปิดรอบและสร้าง ABSENT ให้ผู้เรียนที่ยังไม่มีข้อมูล
- `GET /api/teacher/courses` — อ่านรายวิชา ห้อง ตาราง และจำนวนนักเรียนของครู
- `GET|POST|PATCH /api/teacher/attendance` — อ่าน/บันทึก/แก้สถานะเฉพาะ session ของครู พร้อม Audit Log
- `GET|PATCH /api/teacher/notifications` — อ่านการแจ้งเตือนถาวรและทำเครื่องหมายว่าอ่านแล้ว
- `GET /api/teacher/student-image` — ส่งรูปนักเรียนเมื่อครูเป็นเจ้าของรอบและนักเรียนอยู่ในห้องนั้น
- `GET /api/teacher/reports` — สรุปเฉพาะ course ที่ teacher_id ตรงกับผู้ใช้
- `PATCH /api/teacher/profile` — แก้ข้อมูลติดต่อ/รหัสผ่าน โดย hash ด้วย scrypt
- การเปลี่ยนข้อมูลทุกจุดทำใน transaction เดียวกับ `audit_logs`
- API ที่แก้ข้อมูลฝั่งครูตรวจ same-origin/CSRF และจำกัดอัตราคำขอต่อครู/IP
- การสแกนเปิด Anti-spoof/Liveness และใช้ค่า `school_settings.face_match_threshold`

## ฐานข้อมูล

- `prisma/schema.prisma` — schema กลางที่ map ตรงกับตารางจริง `teachers`, `subjects`, `check_in_sessions` และ `attendance_records`
- `database/admin_schema.sql` — migration แบบเพิ่มข้อมูล รองรับ `created_by_teacher_id` และ `audit_logs` โดยไม่ลบข้อมูลเดิม
- `scripts/migrate-teacher-schedules.mjs` — เพิ่ม schedules, การแจ้งเตือนถาวร และค่า threshold แบบ idempotent
- `scripts/calibrate-face-threshold.mjs` — คำนวณ threshold จากตัวอย่างใบหน้าจริงและบันทึกลง settings

## การทดสอบ

- `npm run test:teacher` — unit tests และประกาศ integration suite (suite ฐานข้อมูลจะ skip หากไม่เปิด flag)
- `npm run test:teacher:security` พร้อม `RUN_TEACHER_SECURITY=1` — ตรวจ RBAC, CSRF และ rate limiting กับ localhost
- `tests/teacher-workflow.integration.test.mjs` — ทดสอบสร้างรอบ เช็คซ้ำ ปิดรอบ และ ownership ภายใน transaction ที่ rollback

Dashboard, รายวิชา และหน้าสแกนใช้ฐานข้อมูลจริงผ่าน Prisma โดยต้องตั้งค่า `DATABASE_URL` กับ `AUTH_SECRET`
