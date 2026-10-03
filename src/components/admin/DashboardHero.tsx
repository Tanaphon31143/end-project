"use client";

import Image from "next/image";
import { CalendarDays, Hand } from "lucide-react";
import { useEffect, useState } from "react";

export function DashboardHero({ schoolName }: { schoolName: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    queueMicrotask(update);
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = now?.getHours() ?? 8;
  const greeting = hour < 12 ? "สวัสดีตอนเช้าครับ" : hour < 17 ? "สวัสดีตอนบ่ายครับ" : "สวัสดีตอนเย็นครับ";
  const date = now?.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now?.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero-watermark" aria-hidden="true">
        <Image src="/school-logo.jpg" alt="" width={180} height={180} priority />
      </div>
      <div className="dashboard-hero-copy">
        <span>ระบบเช็คชื่อนักเรียน {schoolName}</span>
        <h1>{greeting} ผู้ดูแลระบบ <Hand className="dashboard-greeting-icon" size={30} aria-hidden="true" /></h1>
        <p>ยินดีต้อนรับเข้าสู่ระบบบริหารการเข้าเรียนของโรงเรียน</p>
      </div>
      <div className="dashboard-date-card" aria-live="polite">
        <CalendarDays size={21} />
        <div>
          <strong>{date || "กำลังโหลดวันที่..."}</strong>
          <span>{time ? `เวลา ${time} น.` : "กำลังโหลดเวลา..."}</span>
        </div>
      </div>
    </section>
  );
}
