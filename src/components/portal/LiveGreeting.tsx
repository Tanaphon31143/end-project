"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import "./LiveGreeting.css";

const bangkokParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const bangkokDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type Period = { text: string; Icon: LucideIcon; tone: string };

const periods = {
  morning: { text: "สวัสดีตอนเช้า", Icon: Sunrise, tone: "morning" },
  afternoon: { text: "สวัสดีตอนบ่าย", Icon: Sun, tone: "afternoon" },
  evening: { text: "สวัสดีตอนเย็น", Icon: Sunset, tone: "evening" },
  night: { text: "สวัสดีตอนค่ำ", Icon: Moon, tone: "night" },
} satisfies Record<string, Period>;

function timeParts(date: Date) {
  const [hour = "00", minute = "00"] = bangkokParts.format(date).split(":");
  return { hour, minute };
}

function periodFor(hour: number): Period {
  if (hour >= 5 && hour < 12) return periods.morning;
  if (hour >= 12 && hour < 17) return periods.afternoon;
  if (hour >= 17 && hour < 19) return periods.evening;
  return periods.night;
}

/** Current time, refreshed on each minute boundary; null until mounted so SSR markup stays stable. */
export function useBangkokNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(tick, 60_000 - (current.getTime() % 60_000) + 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Time-of-day greeting in Bangkok time, shared by the admin, teacher and student dashboards. */
export function LiveGreeting({ name, polite = false }: { name?: string; polite?: boolean }) {
  const now = useBangkokNow();
  const period = now ? periodFor(Number(timeParts(now).hour)) : null;
  const Icon = period?.Icon;
  const greeting = `${period?.text ?? "สวัสดี"}${polite ? "ครับ" : ""}`;
  // Keep the icon on the same line as the last word so it never wraps on its own.
  const words = [greeting, ...(name?.trim().split(/\s+/) ?? [])];
  const lastWord = words.pop();
  return (
    <span className="portal-greeting" data-period={period?.tone}>
      {words.map((word) => `${word} `).join("")}
      <span className="portal-greeting-tail">
        {lastWord}
        {Icon ? <Icon className="portal-greeting-icon" size={28} aria-hidden="true" /> : null}
      </span>
    </span>
  );
}

/** Thai long date in Bangkok time, or a placeholder before mount. */
export function bangkokDateText(now: Date | null) {
  return now ? bangkokDate.format(now) : "กำลังโหลดวันที่";
}

/** HH:MM น. with a blinking separator. Uses <i> so host styles for spans do not reach the colon. */
export function ClockTime({ now, className = "" }: { now: Date | null; className?: string }) {
  const parts = now ? timeParts(now) : null;
  return (
    <time className={`portal-clock-time ${className}`} dateTime={parts ? `${parts.hour}:${parts.minute}` : undefined}>
      {parts ? parts.hour : "--"}
      <i className="portal-clock-colon">:</i>
      {parts ? parts.minute : "--"} น.
    </time>
  );
}

/** "วันพุธที่ 10 … · 16:24 น." for heroes that show date and time on one line. */
export function LiveDateTime() {
  const now = useBangkokNow();
  return (
    <>
      {bangkokDateText(now)}
      <i className="portal-clock-sep" aria-hidden="true"> · </i>
      <ClockTime now={now} />
    </>
  );
}
