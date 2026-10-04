"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function StatisticsDropdown({ name, label, value, options, icon, onChange }: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  icon: ReactNode;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return <div className="statistics-framed-field statistics-custom-dropdown" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (open && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".statistics-dropdown-option") || []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }}>
    <small id={`${name}-filter-label`}>{label}</small>
    <input type="hidden" name={name} value={value} />
    <button ref={trigger} type="button" className="statistics-dropdown-trigger" aria-labelledby={`${name}-filter-label ${name}-filter-value`} aria-expanded={open} aria-controls={`${name}-filter-options`} onClick={() => setOpen(!open)}>{icon}<span id={`${name}-filter-value`}>{selected?.label || "ไม่มีข้อมูล"}</span><ChevronDown size={16} aria-hidden="true" /></button>
    {open && <div className="statistics-dropdown-options" id={`${name}-filter-options`} role="group" aria-label={label}>{options.map((option) => <button type="button" key={option.value} className="statistics-dropdown-option" aria-pressed={option.value === value} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}><span>{option.label}</span>{option.value === value && <Check size={16} aria-hidden="true" />}</button>)}</div>}
  </div>;
}
