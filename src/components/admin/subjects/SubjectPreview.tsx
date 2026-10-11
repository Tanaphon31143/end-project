"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, GraduationCap, UserRound } from "lucide-react";
import type { SubjectRecord } from "./types";

export function SubjectPreview({ subject, children }: { subject: SubjectRecord; children: ReactNode }) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  function close() {
    if (timer.current) clearTimeout(timer.current);
    setPosition(null);
  }
  function show() {
    if (timer.current) clearTimeout(timer.current);
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: rect.bottom + 240 < window.innerHeight ? rect.bottom + 10 : Math.max(12, rect.top - 240),
    });
  }
  function delayClose() {
    timer.current = setTimeout(close, 100);
  }
  useEffect(() => {
    if (!position) return;
    function dismiss(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    window.addEventListener("keydown", dismiss);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <span ref={anchor} className="subject-preview-anchor" aria-describedby={position ? id : undefined}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }}
    onPointerLeave={delayClose} onFocus={show} onBlur={close} onClick={close}>
    {children}
    {position && createPortal(<div id={id} role="tooltip" className="subject-hover-preview"
      style={position} onPointerEnter={() => { if (timer.current) clearTimeout(timer.current); }} onPointerLeave={close}>
      <header><BookOpen size={22} aria-hidden="true" /><div><small>{subject.subjectCode}</small><strong>{subject.subjectName}</strong></div></header>
      <dl>
        <div><dt><UserRound size={15} aria-hidden="true" />ครูผู้สอน</dt><dd>{subject.teacherName || "ยังไม่กำหนด"}</dd></div>
        <div><dt><GraduationCap size={15} aria-hidden="true" />ชั้นเรียน</dt><dd>{subject.className || "ยังไม่ระบุ"} · {subject.studentCount} นักเรียน</dd></div>
        <div><dt>ภาคเรียน</dt><dd>{subject.semester}/{subject.academicYear}</dd></div>
        <div><dt>{subject.scheduleSource === "SCHEDULE" ? "คาบ/สัปดาห์" : "วัน/สัปดาห์"}</dt><dd>{subject.scheduleSource === "SCHEDULE" ? subject.schedules.length : subject.studyDays.length}</dd></div>
      </dl>
      <footer>คลิกเพื่อดูรายละเอียดและตารางเรียน</footer>
    </div>, document.body)}
  </span>;
}
