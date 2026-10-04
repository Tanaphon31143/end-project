"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./DateTimeInput.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & { type: "date" | "time" };
const pad = (value: number) => String(value).padStart(2, "0");
const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function DateTimeInput(props: Props) {
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [position, setPosition] = useState({ left: 0, top: 0, width: 280 });
  const [draft, setDraft] = useState("");
  const isDate = props.type === "date";
  const value = open ? draft : String(props.value ?? props.defaultValue ?? "");

  function close() { setOpen(false); input.current?.focus(); }
  function show() {
    if (props.disabled || props.readOnly || !input.current) return;
    const current = input.current.value;
    setDraft(current);
    const date = isDate && current ? new Date(`${current}T12:00:00`) : new Date();
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    const rect = input.current.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const height = isDate ? 360 : 320;
    setPosition({ width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 6 : Math.max(12, rect.top - height - 6) });
    setOpen(true);
  }
  function choose(next: string) {
    const element = input.current;
    if (!element) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(element, next);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    setDraft(next);
    close();
  }
  function allowed(next: string) {
    return (!props.min || next >= String(props.min)) && (!props.max || next <= String(props.max));
  }
  useEffect(() => {
    if (!open) return;
    const initial = panel.current?.querySelector<HTMLButtonElement>("[aria-pressed='true']:not(:disabled)") || panel.current?.querySelector<HTMLButtonElement>("[data-choice]:not(:disabled)");
    initial?.focus({ preventScroll: true });
    if (!isDate) initial?.scrollIntoView({ block: "nearest" });
    function outside(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node) && event.target !== input.current) setOpen(false);
    }
    function reposition(event: Event) {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, isDate]);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = month.getDay();
  const step = props.step === "any" ? 60 : Math.max(1, Number(props.step) || 60);
  const base = props.min ? String(props.min).split(":").reduce((sum, part, index) => sum + Number(part) * [3600, 60, 1][index], 0) : 0;
  const times = !isDate ? Array.from({ length: Math.ceil((86400 - base) / step) }, (_, index) => {
    const seconds = base + index * step;
    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}${step < 60 ? `:${pad(seconds % 60)}` : ""}`;
  }).filter(allowed) : [];
  return <>
    <input {...props} ref={input} data-date-time-picker className={`${props.className || ""} ${styles.input}`} aria-haspopup="dialog" aria-controls={open ? id : undefined}
      onClick={(event) => { event.preventDefault(); props.onClick?.(event); show(); }}
      onPointerDown={(event) => { if (!props.disabled && !props.readOnly) { event.preventDefault(); input.current?.focus(); } props.onPointerDown?.(event); }}
      onKeyDown={(event) => { if (["Enter", " ", "ArrowDown"].includes(event.key)) { event.preventDefault(); show(); } props.onKeyDown?.(event); }} />
    {open && createPortal(<div ref={panel} id={id} className={styles.panel} style={position} role="dialog" aria-label={isDate ? "เลือกวันที่" : "เลือกเวลา"}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); close(); }
        if (event.key === "Tab") { setOpen(false); input.current?.focus(); }
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
          const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("[data-choice]:not(:disabled)") || []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (index < 0) return;
          event.preventDefault();
          const shift = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? (isDate ? -7 : -1) : (isDate ? 7 : 1);
          buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + shift))]?.focus();
        }
      }}>
      <header className={styles.header}>
        {isDate ? <><button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><strong aria-live="polite">{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(month)}</strong><button type="button" aria-label="เดือนถัดไป" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button></> : <><strong>เลือกเวลา</strong><button type="button" aria-label="ปิด" onClick={close}><X size={16} /></button></>}
      </header>
      {isDate ? <div className={styles.calendar}>
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(day => <span className={styles.weekday} key={day}>{day}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: days }, (_, i) => { const next = iso(new Date(month.getFullYear(), month.getMonth(), i + 1)); return <button type="button" data-choice key={next} disabled={!allowed(next)} aria-label={next} aria-pressed={value === next} className={value === next ? styles.selected : undefined} onClick={() => choose(next)}>{i + 1}</button>; })}
      </div> : <div className={styles.times}>{times.map(time => <button type="button" data-choice key={time} aria-pressed={value === time} className={value === time ? styles.selected : undefined} onClick={() => choose(time)}>{time}</button>)}</div>}
      <footer className={styles.footer}><button type="button" disabled={props.required} onClick={() => choose("")}>ล้างค่า</button>{isDate && <button type="button" disabled={!allowed(iso(new Date()))} onClick={() => choose(iso(new Date()))}>วันนี้</button>}</footer>
    </div>, document.body)}
  </>;
}
