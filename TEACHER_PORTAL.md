# Teacher Portal

## หน้าจอ

- `src/app/teacher/layout.tsx` — ตรวจ role ครูและครอบทุกหน้าด้วย Sidebar/Topbar
- `src/app/teacher/dashboard/page.tsx` — สรุปตัวเลขวันนี้ รอบล่าสุด และกราฟ 6 วันทำการ
- `src/app/teacher/courses/page.tsx` — การ์ดรายวิชาและฟอร์มสร้างรอบเช็คชื่อ
- `src/app/teacher/scan/[sessionId]/page.tsx` — พื้นที่กล้อง ผลรู้จำ และตารางสถานะแบบเรียลไทม์
- `src/app/teacher/history/page.tsx` — ตัวกรองและประวัติราย session
- `src/app/teacher/reports/page.tsx` — รายงานรายวัน/สัปดาห์/เดือน
- `src/app/teacher/profile/page.tsx` — ข้อมูลส่วนตัวและเปลี่ยนรหัสผ่าน

## Components

- `TeacherShell.tsx`, `Sidebar.tsx` — layout responsive และเมนู mobile
- `StatCard.tsx`, `CourseCard.tsx` — การ์ดที่นำกลับมาใช้ซ้ำได้
- `AttendanceChart.tsx` — กราฟ Recharts สามสถานะ
- `LiveScanFeed.tsx` — UI การสแกนและ polling จำลอง 5 วินาที

## API และความปลอดภัย

- `src/lib/auth.ts` และ `src/lib/api-auth.ts` — อ่าน session, บังคับ role teacher และใช้ `teachers.id` จาก session โดยตรง
- `POST /api/teacher/sessions` — สร้าง attendance session หลังตรวจ ownership
- `GET|POST /api/teacher/attendance` — อ่าน/บันทึกเฉพาะ session ของครู และไม่บันทึกใบหน้าที่ไม่พบ student
- `GET /api/teacher/reports` — สรุปเฉพาะ course ที่ teacher_id ตรงกับผู้ใช้
- `PATCH /api/teacher/profile` — แก้ข้อมูลติดต่อ/รหัสผ่าน โดย hash ด้วย scrypt
- การเปลี่ยนข้อมูลทุกจุดทำใน transaction เดียวกับ `audit_logs`

## ฐานข้อมูล

- `prisma/schema.prisma` — schema กลางที่ map ตรงกับตารางจริง `teachers`, `subjects`, `check_in_sessions` และ `attendance_records`
- `database/admin_schema.sql` — migration แบบเพิ่มข้อมูล รองรับ `created_by_teacher_id` และ `audit_logs` โดยไม่ลบข้อมูลเดิม

หน้าจอใช้ข้อมูลตัวอย่างเพื่อเปิดดูได้โดยไม่ต้องมีฐานข้อมูล ส่วน API ใช้ Prisma จริงและต้องตั้งค่า `DATABASE_URL` กับ `AUTH_SECRET` ก่อนใช้งาน production
