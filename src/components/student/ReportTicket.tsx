"use client";

import { useEffect, useRef } from "react";

type Props = {
  ticketId: string;
  date: string;
  time: string;
  room: string;
  subject: string;
  issueType: string;
  details: string;
  attachmentCount: number;
  sent: boolean;
};

const bars = [14, 4, 18, 8, 3, 12, 6, 20, 5, 16, 9, 4, 15, 7, 18, 5, 12, 4, 21, 8];
const value = (text: string) => text || "ยังไม่ระบุ";

export default function ReportTicket({ ticketId, date, time, room, subject, issueType, details, attachmentCount, sent }: Props) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);
  function tilt(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || !ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => ref.current?.style.setProperty("--ticket-transform", `perspective(900px) rotateY(${x * 16}deg) rotateX(${y * -12}deg)`));
  }
  function resetTilt() { if (frame.current) cancelAnimationFrame(frame.current); ref.current?.style.setProperty("--ticket-transform", "perspective(900px) rotateY(0deg) rotateX(0deg)"); }
  return (
    <aside ref={ref} className={`report-ticket${sent ? " is-sent" : ""}`} onPointerMove={tilt} onPointerLeave={resetTilt} aria-label="ตัวอย่างตั๋วคำร้อง">
      <div className="report-ticket-head"><span>คำร้องแจ้งปัญหา</span><strong>{ticketId}</strong><b>{sent ? "รอตรวจสอบ" : "ฉบับร่าง"}</b></div>
      <div className="report-ticket-body">
        <dl>
          <div><dt>วันที่เกิดปัญหา</dt><dd>{value(date)}</dd></div>
          <div><dt>เวลา · ห้อง</dt><dd>{time || room ? `${value(time)} · ${value(room)}` : "ยังไม่ระบุ"}</dd></div>
          <div><dt>รายวิชา</dt><dd>{value(subject)}</dd></div>
          <div><dt>ประเภทปัญหา</dt><dd>{value(issueType)}</dd></div>
          <div><dt>รายละเอียด</dt><dd className="report-ticket-details">{value(details)}</dd></div>
          <div><dt>ไฟล์แนบ</dt><dd>{attachmentCount ? `${attachmentCount} รูป` : "ไม่มีไฟล์แนบ"}</dd></div>
        </dl>
        <div className="report-ticket-barcode" aria-hidden="true">{bars.map((width, index) => <i key={index} style={{ width }} />)}</div>
      </div>
      {sent && <div className="report-ticket-stamp">ส่งแล้ว</div>}
    </aside>
  );
}
