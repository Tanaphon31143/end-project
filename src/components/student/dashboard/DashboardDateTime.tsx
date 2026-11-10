"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { bangkokDateText, ClockTime, useBangkokNow } from "@/components/portal/LiveGreeting";

export default function DashboardDateTime() {
  const now = useBangkokNow();
  return (
    <div className="dashboard-date-time">
      <CalendarDays size={19} aria-hidden="true" />
      <div>
        <span>{bangkokDateText(now)}</span>
        <strong>
          <Clock3 size={15} aria-hidden="true" /> <ClockTime now={now} />
        </strong>
      </div>
    </div>
  );
}
