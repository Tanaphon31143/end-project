"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

function formatNow(date: Date) {
  return {
    date: new Intl.DateTimeFormat("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
}

export default function DashboardDateTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const formatted = now ? formatNow(now) : null;
  return (
    <div className="dashboard-date-time" aria-live="polite">
      <CalendarDays size={19} aria-hidden="true" />
      <div>
        <span>{formatted?.date ?? "กำลังโหลดวันที่"}</span>
        <strong>
          <Clock3 size={15} aria-hidden="true" /> {formatted?.time ?? "--:--"} น.
        </strong>
      </div>
    </div>
  );
}
