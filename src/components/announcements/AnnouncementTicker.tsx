"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Megaphone } from "lucide-react";
import "./AnnouncementTicker.css";

export type TickerItem = { id: number; title: string; createdAt: string };

const postedAt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatPosted(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : postedAt.format(date);
}

/**
 * The same school announcements, shown as one strip on the admin, teacher and student dashboards.
 * Rotates every 6 s; hovering, focusing or picking a dot stops it, as does reduced motion.
 */
export function AnnouncementTicker({
  items,
  href,
  linkLabel,
  audienceNote,
  emptyText,
}: {
  items: TickerItem[];
  href: string;
  linkLabel: string;
  audienceNote?: string;
  /** Shown instead of hiding the strip when nothing is published. */
  emptyText?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (items.length < 2 || paused || pinned) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 6000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, pinned]);

  if (!items.length) {
    if (!emptyText) return null;
    return (
      <section className="announcement-ticker is-empty" aria-label="ประกาศจากโรงเรียน">
        <span className="announcement-ticker-badge">
          <span className="announcement-ticker-icon" aria-hidden="true"><Megaphone size={17} /></span>
          ประกาศ
        </span>
        <p className="announcement-ticker-body announcement-ticker-empty">{emptyText}</p>
        <Link className="announcement-ticker-link" href={href}>
          {linkLabel}
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }
  const current = items[index % items.length];

  return (
    <section
      className="announcement-ticker"
      aria-label="ประกาศจากโรงเรียน"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <span className="announcement-ticker-badge">
        <span className="announcement-ticker-icon" aria-hidden="true">
          <Megaphone size={17} />
        </span>
        ประกาศ
      </span>
      <div className="announcement-ticker-body">
        <p key={current.id} className="announcement-ticker-item">
          <strong>{current.title}</strong>
          <time dateTime={current.createdAt}>{formatPosted(current.createdAt)}</time>
        </p>
        {audienceNote ? <small className="announcement-ticker-note">{audienceNote}</small> : null}
      </div>
      {items.length > 1 ? (
        <div className="announcement-ticker-dots" role="group" aria-label="เลือกประกาศ">
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`ประกาศที่ ${itemIndex + 1}: ${item.title}`}
              aria-pressed={itemIndex === index % items.length}
              onClick={() => {
                setIndex(itemIndex);
                setPinned(true);
              }}
            />
          ))}
        </div>
      ) : null}
      <Link className="announcement-ticker-link" href={href}>
        {linkLabel}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
