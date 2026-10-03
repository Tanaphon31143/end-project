import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Pencil, UserRound } from "lucide-react";
import type { TeacherIdentity } from "@/lib/teacher-data";

export function DashboardHero({
  identity,
  date,
}: {
  identity: TeacherIdentity;
  date: string;
}) {
  const name = identity.name.trim() || "คุณครู";
  const greetingBase = name.replace(/^(นาย|นางสาว|นาง)/, "").trim();
  const greetingName = greetingBase.startsWith("คุณครู")
    ? greetingBase
    : `คุณครู${greetingBase}`;
  const department =
    identity.position === "ครูผู้สอน" ? "" : identity.position;

  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-greeting">
      <Image
        className="dashboard-hero-watermark"
        src="/school-logo.jpg"
        alt=""
        width={520}
        height={520}
        priority
        aria-hidden="true"
      />
      <div className="dashboard-hero-copy">
        <h2 id="dashboard-greeting">
          สวัสดีครับ {greetingName} <span aria-hidden="true">👋</span>
        </h2>
        <p className="dashboard-hero-lead">
          ยินดีต้อนรับเข้าสู่ระบบเช็คชื่อด้วยการสแกนใบหน้า
        </p>
        <p className="dashboard-hero-date">
          <CalendarDays size={21} aria-hidden="true" />
          <span>{date}</span>
        </p>
        <blockquote>
          “การเรียนรู้วันนี้ สร้างอนาคตที่ดีกว่าให้กับนักเรียน”
        </blockquote>
      </div>
      <p className="dashboard-hero-quote">
        “การศึกษาคือ
        <br />
        การลงทุนที่คุ้มค่าที่สุด”
      </p>
      <article className="dashboard-profile-card">
        <div className="dashboard-profile-avatar">
          {identity.hasProfileImage ? (
            <Image
              src="/api/teacher/profile-image"
              alt={`รูปโปรไฟล์ของ ${name}`}
              width={88}
              height={88}
              unoptimized
            />
          ) : (
            <span>{identity.initials}</span>
          )}
        </div>
        <div className="dashboard-profile-copy">
          <strong>{name}</strong>
          <span>ครูผู้สอน</span>
          {department && <small>{department}</small>}
        </div>
        <div className="dashboard-profile-actions">
          <Link className="dashboard-profile-primary" href="/teacher/profile">
            <UserRound size={15} aria-hidden="true" /> ดูโปรไฟล์
          </Link>
          <Link className="dashboard-profile-secondary" href="/teacher/profile">
            <Pencil size={14} aria-hidden="true" /> แก้ไขโปรไฟล์
          </Link>
        </div>
      </article>
    </section>
  );
}
