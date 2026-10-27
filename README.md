# School OS — ระบบเช็คชื่อนักเรียนด้วยใบหน้า

ระบบเช็คชื่อและจัดการข้อมูลการเรียนของโรงเรียน แบ่งเป็น 3 พอร์ทัล

- **แอดมิน** (`/admin`) — จัดการผู้ใช้ ห้องเรียน รายวิชา ภาคเรียน ประกาศ ข้อมูลใบหน้า การเข้าเรียน และรายงาน
- **ครู** (`/teacher`) — เปิด/ปิดรอบเช็คชื่อ สแกนใบหน้า ดูประวัติและรายงาน ขอเปิดรายวิชา
- **นักเรียน** (`/student`) — เช็คชื่อด้วยใบหน้า (มีตรวจใบหน้าจริง) ดูตารางเรียน สถิติ แจ้งปัญหาการเข้าเรียน ลงทะเบียนใบหน้าด้วยตัวเอง

ใช้ Next.js 16 (App Router) + React 19, ฐานข้อมูล MySQL หรือ TiDB ผ่าน `mysql2` และ Prisma, ตรวจใบหน้าด้วย `@vladmandic/human`

## เริ่มใช้งาน

ต้องมี Node.js 20.6 ขึ้นไป (สคริปต์ใช้ `--env-file`; ทดสอบกับ Node 24) และฐานข้อมูล MySQL 8 หรือ TiDB

```bash
npm install
cp .env.example .env.local
npm run dev
```

เปิด <http://localhost:3000> แล้วเข้าสู่ระบบ

### ตัวแปรสภาพแวดล้อม (`.env.local`)

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `DATABASE_URL` | การเชื่อมต่อฐานข้อมูล (`mysql://user:pass@host:port/db`) |
| `AUTH_SECRET` | คีย์ลงลายเซ็นคุกกี้เข้าสู่ระบบ ใช้ค่าสุ่มยาว ๆ |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` | เข้าสู่ระบบด้วย Google |
| `APP_URL`, `RESEND_API_KEY`, `PASSWORD_RESET_FROM` | อีเมลกู้รหัสผ่าน (ดู [docs/portal-features.md](docs/portal-features.md)) |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | ไม่บังคับ ตั้งเป็น `false` เฉพาะฐานข้อมูลทดสอบที่ไม่มีใบรับรองที่ถูกต้อง |

ห้ามใส่ค่าลับในตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_`

## ฐานข้อมูลและ migration

ตารางส่วนใหญ่สร้างด้วยสคริปต์ใน `scripts/` (ไม่ได้ใช้ `prisma migrate`) และ `prisma/schema.prisma` มีแค่บางตาราง **ห้ามรัน `prisma db push`** เพราะจะลบคอลัมน์ที่ Prisma ไม่รู้จัก

สคริปต์ส่วนใหญ่รันซ้ำได้ และหลายตัวมีโหมด `:check` ที่อ่านอย่างเดียว ให้รันโหมดนี้ก่อนทุกครั้ง ลำดับตามวันที่เพิ่มสคริปต์:

```bash
npm run db:admin-schema
npm run db:teacher-schedules
npm run db:student-round1
npm run db:student-round2
npm run db:student-round3
npm run db:student-face-self-enrollment
npm run db:student-face-identity
npm run db:student-face-email-binding
npm run db:teacher-subject-requests
npm run db:auth-security
npm run db:read-performance
node --env-file=.env.local scripts/migrate-portal-features.mjs
npm run db:school-announcements
npm run db:academic-terms
npm run db:student-password-change
npm run db:attendance-time-utc
```

ตารางหลักเริ่มต้นอยู่ใน `database/schema.sql` ถ้าจะตั้งฐานข้อมูลใหม่ทั้งหมด ให้ทดสอบลำดับนี้กับฐานข้อมูลทดสอบก่อน

### เรื่องเวลา

นาฬิกาของฐานข้อมูลเป็น **UTC** เวลาที่บันทึกไว้ (`created_at`, `check_in_time` ฯลฯ) จึงเป็น UTC ทั้งหมด ส่วนเวลาคาบเรียน (`start_time`, `late_after`) และวันที่เรียน (`attendance_date`, `session_date`) เป็นเวลาไทย

- อย่าใช้ `CURRENT_TIME`, `CURDATE()` หรือ `NOW()` แทน "ตอนนี้ตามเวลาโรงเรียน" ให้ใช้ `UTC_TIMESTAMP() + INTERVAL 7 HOUR`
- เวลาที่แสดงผลต้องบวก 7 ชั่วโมง เช่น `DATE_FORMAT(created_at + INTERVAL 7 HOUR, ...)`

### ภาคเรียน

รายชื่อนักเรียนแต่ละภาคเรียนอยู่ใน `student_term_enrollments` ภาคเรียนปัจจุบันกำหนดที่ `school_settings` ส่วน `students.class_id` เป็นข้อมูลเก่าที่ไม่ได้อัปเดตแล้ว อย่าใช้หาห้องของนักเรียน รายละเอียดอยู่ที่ [docs/academic-terms.md](docs/academic-terms.md)

## บัญชีและความปลอดภัย

- นักเรียนที่นำเข้าจาก Excel ได้รหัสผ่านเริ่มต้น `student@123` และนักเรียนที่แอดมินตั้งรหัสให้ ต้องตั้งรหัสใหม่ก่อนใช้งาน (`students.must_change_password`)
- `src/proxy.ts` ปฏิเสธคำขอ `POST/PUT/PATCH/DELETE` ไปยัง `/api` ที่มาจากเว็บอื่น
- ทุก route ใน `/api` ตรวจสิทธิ์ตามบทบาทเอง

## ทดสอบ

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

`npm test` รันทุกไฟล์ `tests/*.test.mjs` เทสต์ `*.integration.test.mjs` ต้องต่อฐานข้อมูล และจะข้ามตัวเองถ้าต่อไม่ได้ สคริปต์ `test:*:integration` อ่าน `.env.test` ส่วน `test:*:security` อ่าน `.env.local` เทสต์เหล่านี้เขียนข้อมูล จึงควรชี้ไปที่ฐานข้อมูลทดสอบเท่านั้น

## Deploy

ตั้งค่าไว้สำหรับ Vercel (`vercel.json`, region `sin1`) ใส่ตัวแปรจากตารางด้านบนในตัวจัดการค่าลับของ host แล้วรัน migration ที่ยังไม่ได้รัน **ก่อน** deploy โค้ดใหม่
