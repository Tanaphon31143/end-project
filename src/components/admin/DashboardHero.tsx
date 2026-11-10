"use client";

import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { bangkokDateText, ClockTime, LiveGreeting, useBangkokNow } from "@/components/portal/LiveGreeting";

export function DashboardHero({ schoolName }: { schoolName: string }) {
  const now = useBangkokNow();

  return (
    <section className="dashboard-hero">
      <div className="dashboard-hero-watermark" aria-hidden="true">
        <Image src="/school-logo.jpg" alt="" width={180} height={180} priority />
      </div>
      <div className="dashboard-hero-copy">
        <span>ระบบเช็คชื่อนักเรียน {schoolName}</span>
        <h1><LiveGreeting name="ผู้ดูแลระบบ" polite /></h1>
        <p>ยินดีต้อนรับเข้าสู่ระบบบริหารการเข้าเรียนของโรงเรียน</p>
      </div>
      <div className="dashboard-date-card">
        <CalendarDays size={21} aria-hidden="true" />
        <div>
          <strong>{bangkokDateText(now)}</strong>
          <span>เวลา <ClockTime now={now} /></span>
        </div>
      </div>
    </section>
  );
}
