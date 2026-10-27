"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlarmClock, ArrowDownUp, Bold, CalendarClock, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Eye, EyeOff, FileText, FileUp, Italic, Link2, List, ListOrdered, LoaderCircle, Megaphone, MoreHorizontal, Paperclip, Pencil, Plus, Search, Send, ShieldCheck, Trash2, Underline, Upload, Users, X } from "lucide-react";
import type { Announcement } from "@/lib/announcements";
import AnnouncementContent from "@/components/announcements/AnnouncementContent";
import "./AnnouncementsManager.css";
import "./AnnouncementInteractions.css";

type Filter = "all" | "published" | "scheduled" | "hidden";
type Sort = "newest" | "oldest" | "title";
type Listing = {
  announcements: Announcement[];
  stats: { total: number; published: number; scheduled: number; hidden: number };
  total: number; page: number; pageSize: number;
  capabilities: { attachments: boolean; scheduling: boolean; richText?: boolean; titleMaxLength?: number };
};
type AnnouncementTemplate = { label: string; title: string; message: string; Icon: typeof Megaphone };
type Confirmation = { kind: "reset" } | { kind: "delete"; item: Announcement } | { kind: "template"; template: AnnouncementTemplate };
const statusLabels = { published: "เผยแพร่แล้ว", scheduled: "รอเผยแพร่", hidden: "ซ่อนอยู่" };
const emptyStats = { total: 0, published: 0, scheduled: 0, hidden: 0 };
const maxFiles = 5;
const announcementTemplates: AnnouncementTemplate[] = [
  { label: "ข่าวทั่วไป", Icon: Megaphone, title: "[หัวข้อข่าวสารจากโรงเรียน]", message: "เรียน นักเรียนทุกคน\n\n[ระบุรายละเอียดข่าวสารที่ต้องการแจ้ง]\n\n**ข้อมูลสำคัญ**\n- [รายละเอียดที่นักเรียนควรทราบ]\n- [ช่องทางติดต่อสอบถาม]" },
  { label: "กิจกรรม", Icon: CalendarDays, title: "[ชื่อกิจกรรมของโรงเรียน]", message: "ขอเชิญนักเรียนเข้าร่วม **[ชื่อกิจกรรม]**\n\n- วันที่: [ระบุวันที่]\n- เวลา: [ระบุเวลา]\n- สถานที่: [ระบุสถานที่]\n\n**สิ่งที่ต้องเตรียม**\n[ระบุรายละเอียดและวิธีเข้าร่วมกิจกรรม]" },
  { label: "แจ้งเตือน", Icon: AlarmClock, title: "แจ้งเตือน: [เรื่องที่ต้องดำเนินการ]", message: "เรียน นักเรียนที่เกี่ยวข้อง\n\nขอให้นักเรียน **[ระบุสิ่งที่ต้องดำเนินการ]**\nภายในวันที่ **[ระบุวันครบกำหนด]**\n\n**ขั้นตอนดำเนินการ**\n1. [ขั้นตอนแรก]\n2. [ขั้นตอนถัดไป]\n\nสอบถามเพิ่มเติม: [ระบุช่องทางติดต่อ]" },
];

function localDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}+07:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
function fileSize(size: number) { return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(size / 1024))} KB`; }

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="announcement-dialog" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} aria-label={title}>
    <div className="announcement-dialog-head"><h2>{title}</h2><button type="button" className="ann-icon-button" aria-label="ปิดหน้าต่าง" onClick={onClose}><X size={20} /></button></div>
    {children}
  </dialog>;
}

function SelectedFileIcon({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!file.type.startsWith("image/") || !ref.current) return;
    const url = URL.createObjectURL(file);
    ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!file.type.startsWith("image/")) return <FileText size={18} />;
  // Local file previews exist only in this form and are revoked when removed.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} className="announcement-file-thumbnail" alt={`ตัวอย่าง ${file.name}`} />;
}

function BangkokClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update(); const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="announcement-clock" aria-label="วันและเวลาปัจจุบันในประเทศไทย">
    <CalendarDays size={21} aria-hidden="true" />
    <div className="announcement-clock-date"><strong>{now ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", weekday: "long" }).format(now) : "เวลาประเทศไทย"}</strong><span>{now ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" }).format(now) : "Asia/Bangkok"}</span></div>
    <time dateTime={now?.toISOString()}>{now ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(now) : "--:--"}<small>เวลาในประเทศไทย</small></time>
  </div>;
}

export default function AnnouncementsManager({ initial }: { initial: Listing | Announcement[] }) {
  const [listing, setListing] = useState<Listing>(() => Array.isArray(initial) ? { announcements: initial, stats: { ...emptyStats, total: initial.length, published: initial.filter((item) => item.published).length, hidden: initial.filter((item) => !item.published).length }, total: initial.length, page: 1, pageSize: 20, capabilities: { attachments: false, scheduling: false } } : initial);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [removedFiles, setRemovedFiles] = useState<number[]>([]);
  const [publishMode, setPublishMode] = useState<"now" | "scheduled">("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [scheduleCheckedAt, setScheduleCheckedAt] = useState(() => Date.now());
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [dragging, setDragging] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Announcement | null>(null);
  const [libraryView, setLibraryView] = useState<"list" | "preview">("list");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const firstRequest = useRef("all|newest|1|20||0");
  const stats = listing.stats;
  const titleLimit = listing.capabilities.titleMaxLength || 200;
  const retainedFiles = (editing?.attachments || []).filter((file) => !removedFiles.includes(file.id));

  useEffect(() => { const timer = window.setTimeout(() => { setQuery(queryInput.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [queryInput]);
  useEffect(() => {
    const key = `${filter}|${sort}|${page}|${pageSize}|${query}|${refresh}`;
    if (key === firstRequest.current) return;
    firstRequest.current = key;
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    const params = new URLSearchParams({ status: filter, sort, page: String(page), pageSize: String(pageSize), query });
    setLoading(true);
    fetch(`/api/admin/announcements?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "โหลดประกาศไม่สำเร็จ"); return data as Listing; })
      .then((data) => { setListing(data); setError(false); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) { setError(true); setFeedback(cause instanceof Error ? cause.message : "โหลดประกาศไม่สำเร็จ กรุณาลองใหม่"); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, sort, page, pageSize, query, refresh]);
  useEffect(() => { const timer = window.setInterval(() => { if (!document.hidden && !busyRef.current) { setRefresh((value) => value + 1); setScheduleCheckedAt(Date.now()); } }, 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (menuId === null) return;
    const close = (event: MouseEvent) => { if (!(event.target as Element).closest(".announcement-item-menu")) setMenuId(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuId(null); };
    document.addEventListener("click", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", escape); };
  }, [menuId]);

  function notify(text: string, failed = false) { setFeedback(text); setError(failed); }
  function focusComposer() { titleRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" }); titleRef.current?.focus({ preventScroll: true }); }
  function resetForm() { setTitle(""); setMessage(""); setFiles([]); setRemovedFiles([]); setPublishMode("now"); setDate(""); setTime(""); setEditing(null); setLinkOpen(false); if (fileRef.current) fileRef.current.value = ""; }
  function clearFilters() { setQueryInput(""); setQuery(""); setFilter("all"); setPage(1); }
  function applyTemplate(template: AnnouncementTemplate) {
    setTitle(template.title); setMessage(template.message); setLibraryView("preview"); setLinkOpen(false);
    requestAnimationFrame(() => { editorRef.current?.focus({ preventScroll: true }); });
  }
  function showDraftPreview() {
    setLibraryView("preview");
    requestAnimationFrame(() => {
      libraryRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      libraryRef.current?.focus({ preventScroll: true });
    });
  }

  async function save(body: FormData | object, method: string, success: string) {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setFeedback(""); setError(false); requestRef.current?.abort(); setLoading(false);
    try {
      const multipart = body instanceof FormData;
      const response = await fetch("/api/admin/announcements", { method, ...(!multipart && { headers: { "Content-Type": "application/json" } }), body: multipart ? body : JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่");
      setListing(data); clearFilters(); setSort("newest"); setPageSize(20); firstRequest.current = `all|newest|1|20||${refresh}`;
      notify(success); setMenuId(null); return true;
    } catch (cause) { notify(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่", true); return false; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) { notify("กรุณาระบุหัวข้อและเนื้อหาประกาศ", true); return; }
    let scheduledAt = "";
    if (publishMode === "scheduled") {
      const scheduled = new Date(`${date}T${time}:00+07:00`);
      if (!date || !time || !Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= Date.now()) { notify("กรุณาเลือกวันและเวลาในอนาคต ตามเวลาประเทศไทย", true); return; }
      scheduledAt = scheduled.toISOString();
    }
    const body = new FormData(); body.set("title", title.trim()); body.set("message", message.trim()); if (!editing || editing.status !== "hidden" || publishMode === "scheduled") body.set("scheduledAt", scheduledAt);
    if (editing) { body.set("id", String(editing.id)); body.set("removeAttachmentIds", JSON.stringify(removedFiles)); }
    files.forEach((file) => body.append("attachments[]", file));
    const success = editing ? "บันทึกการแก้ไขประกาศเรียบร้อยแล้ว" : publishMode === "scheduled" ? "ตั้งเวลาเผยแพร่ประกาศเรียบร้อยแล้ว" : "เผยแพร่ประกาศเรียบร้อยแล้ว";
    if (await save(body, editing ? "PATCH" : "POST", success)) { resetForm(); setLibraryView("list"); }
  }
  function selectFiles(selected: FileList | File[]) {
    const incoming = Array.from(selected);
    if (files.length + retainedFiles.length + incoming.length > maxFiles) { notify(`แนบไฟล์ได้สูงสุด ${maxFiles} ไฟล์ต่อประกาศ`, true); return; }
    if (incoming.some((file) => !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type))) { notify("รองรับเฉพาะไฟล์ JPG, PNG, WebP และ PDF", true); return; }
    if (incoming.some((file) => file.size > 10 * 1024 * 1024 || !file.size)) { notify("แต่ละไฟล์ต้องมีข้อมูลและมีขนาดไม่เกิน 10 MB", true); return; }
    setFiles((current) => [...current, ...incoming]); setFeedback("");
    if (fileRef.current) fileRef.current.value = "";
  }
  function format(before: string, after = before, fallback = "ข้อความ") {
    const editor = editorRef.current; if (!editor || busy) return;
    const start = editor.selectionStart; const end = editor.selectionEnd;
    const selection = message.slice(start, end) || fallback;
    const inserted = `${before}${selection}${after}`;
    if (message.length - (end - start) + inserted.length > 5000) { notify("เนื้อหาประกาศยาวได้ไม่เกิน 5,000 ตัวอักษร", true); return; }
    setMessage(`${message.slice(0, start)}${inserted}${message.slice(end)}`);
    requestAnimationFrame(() => { editor.focus(); editor.setSelectionRange(start + before.length, start + before.length + selection.length); });
  }
  function insertLink() {
    let url: URL;
    try { url = new URL(linkUrl); if (!["https:", "http:"].includes(url.protocol) || /[\s()\[\]]/.test(linkUrl)) throw new Error(); }
    catch { notify("กรุณาระบุลิงก์ที่ขึ้นต้นด้วย https:// หรือ http://", true); return; }
    format("[", `](${url.href})`, "ข้อความลิงก์"); setLinkOpen(false); setLinkUrl("");
  }
  function editItem(item: Announcement, checkedAt: number) {
    if ((title || message || files.length || editing) && !window.confirm("แทนที่ข้อมูลในแบบฟอร์มด้วยประกาศที่เลือกหรือไม่?")) return;
    setEditing(item); setTitle(item.title); setMessage(item.message); setFiles([]); setRemovedFiles([]); setMenuId(null); setScheduleCheckedAt(checkedAt);
    if (item.status === "scheduled" && item.scheduledAt) {
      const bangkok = new Date(new Date(item.scheduledAt).getTime() + 7 * 60 * 60 * 1000).toISOString();
      setPublishMode("scheduled"); setDate(bangkok.slice(0, 10)); setTime(bangkok.slice(11, 16));
    } else { setPublishMode("now"); setDate(""); setTime(""); }
    focusComposer();
  }
  const tabs = [{ value: "all", label: "ทั้งหมด", count: stats.total }, { value: "published", label: "เผยแพร่แล้ว", count: stats.published }, { value: "scheduled", label: "รอเผยแพร่", count: stats.scheduled }, { value: "hidden", label: "ซ่อนอยู่", count: stats.hidden }] as const;
  const pages = Math.max(1, Math.ceil(listing.total / pageSize));
  const first = listing.total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, listing.total);
  const scheduleDate = date && time ? new Date(`${date}T${time}:00+07:00`) : null;
  const scheduleReady = !!scheduleDate && Number.isFinite(scheduleDate.getTime()) && scheduleDate.getTime() > scheduleCheckedAt;
  const publishSummary = publishMode === "scheduled"
    ? scheduleReady ? `ตั้งเวลาเผยแพร่ ${localDate(scheduleDate!.toISOString())} (เวลาประเทศไทย)` : "เลือกวันและเวลาเผยแพร่ในแบบฟอร์ม"
    : editing?.status === "hidden" ? "บันทึกการแก้ไขโดยคงสถานะซ่อนอยู่" : "แสดงบน Dashboard ของนักเรียนเมื่อกดเผยแพร่";

  return <main className="admin-content announcements-manager" aria-labelledby="announcements-heading">
    <header className="announcement-hero">
      <div className="announcement-hero-main"><span className="announcement-hero-icon"><Megaphone size={32} strokeWidth={1.8} aria-hidden="true" /></span><div><h1 id="announcements-heading">ประกาศจากโรงเรียน</h1><p>เผยแพร่ข่าวสารสำคัญให้นักเรียนเห็นบน Dashboard ได้ทันที</p><div className="announcement-hero-features"><span><Check size={14} />รวดเร็ว</span><span><Users size={14} />เข้าถึงทุกคน</span><span><Paperclip size={14} />รองรับไฟล์แนบ</span></div></div></div>
      <BangkokClock />
    </header>

    <section className="announcement-stats" aria-label="สรุปประกาศทั้งหมดในระบบ">
      {[{ label: "ทั้งหมด", value: stats.total, unit: "รายการประกาศ", Icon: FileText, tone: "blue", filter: "all" }, { label: "เผยแพร่แล้ว", value: stats.published, unit: "รายการ", Icon: CheckCircle2, tone: "green", filter: "published" }, { label: "รอเผยแพร่", value: stats.scheduled, unit: "รายการ", Icon: Clock3, tone: "amber", filter: "scheduled" }, { label: "ซ่อนอยู่", value: stats.hidden, unit: "รายการ", Icon: EyeOff, tone: "rose", filter: "hidden" }].map(({ label, value, unit, Icon, tone, filter: target }) => <button type="button" key={tone} className={`announcement-stat is-${tone}`} onClick={() => { setFilter(target as Filter); setPage(1); setLibraryView("list"); }} aria-pressed={filter === target && libraryView === "list"} aria-label={`${label} ${value} ${unit} กรองรายการ`}><span className="announcement-stat-icon"><Icon size={27} strokeWidth={1.8} /></span><span><span className="announcement-stat-label">{label}</span><strong>{value.toLocaleString("th-TH")}</strong><small>{unit}</small></span></button>)}
    </section>

    {feedback && <div className={`announcement-feedback${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>{error ? <ShieldCheck size={19} /> : <CheckCircle2 size={19} />}<span>{feedback}</span>{error && <button type="button" className="announcement-retry" onClick={() => { setRefresh((value) => value + 1); setFeedback(""); }}>ลองโหลดอีกครั้ง</button>}<button type="button" aria-label="ปิดข้อความ" onClick={() => setFeedback("")}><X size={17} /></button></div>}

    <div className="announcements-workspace">
      <form className="announcement-composer" onSubmit={submit} aria-labelledby="composer-heading">
        <div className="announcement-section-heading"><span className="announcement-section-icon is-primary"><Pencil size={23} aria-hidden="true" /></span><div><h2 id="composer-heading">{editing ? "แก้ไขประกาศ" : "เขียนประกาศใหม่"}</h2><p>{editing ? `กำลังแก้ไขประกาศ #${editing.id}` : "ส่งข่าวสารสำคัญถึงนักเรียนในโรงเรียน"}</p></div><button className="announcement-composer-preview" type="button" aria-label="ดูตัวอย่าง" onClick={showDraftPreview}><Eye size={17} aria-hidden="true" /><span>ดูตัวอย่าง</span></button>{editing && <button className="ann-icon-button" type="button" aria-label="ยกเลิกการแก้ไข" onClick={() => setConfirmation({ kind: "reset" })}><X size={19} /></button>}</div>
        <div className="announcement-composer-body">
          {!editing && <div className="announcement-templates"><p className="announcement-template-label"><FileText size={15} aria-hidden="true" />เริ่มเขียนด้วยแม่แบบ<span>เลือกแล้วปรับข้อความได้เลย</span></p><div className="announcement-template-options">{announcementTemplates.map((template) => <button type="button" className="announcement-template-button" key={template.label} disabled={busy} onClick={() => { if (title || message) setConfirmation({ kind: "template", template }); else applyTemplate(template); }}><template.Icon size={16} aria-hidden="true" />{template.label}<ChevronRight size={14} aria-hidden="true" /></button>)}</div></div>}
          <div className="announcement-field"><label htmlFor="announcement-title">หัวข้อประกาศ <span aria-hidden="true">*</span></label><input id="announcement-title" ref={titleRef} name="title" required maxLength={titleLimit} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="ระบุหัวข้อให้สั้นและชัดเจน" aria-describedby="announcement-title-count" /><small id="announcement-title-count" className="announcement-count">{title.length}/{titleLimit}</small></div>
          <div className="announcement-field"><label htmlFor="announcement-message">เนื้อหาประกาศ <span aria-hidden="true">*</span></label><div className="announcement-editor"><div className="announcement-toolbar" role="toolbar" aria-label="จัดรูปแบบข้อความ">
            {[{ label: "ตัวหนา", Icon: Bold, start: "**", end: "**" }, { label: "ตัวเอียง", Icon: Italic, start: "*", end: "*" }, { label: "ขีดเส้นใต้", Icon: Underline, start: "__", end: "__" }, { label: "รายการหัวข้อย่อย", Icon: List, start: "\n- ", end: "" }, { label: "รายการลำดับเลข", Icon: ListOrdered, start: "\n1. ", end: "" }].map(({ label, Icon, start, end }) => <button key={label} type="button" title={label} aria-label={label} disabled={busy} onClick={() => format(start, end)}><Icon size={17} /></button>)}<span className="announcement-toolbar-divider" /><button type="button" title="แทรกลิงก์" aria-label="แทรกลิงก์" aria-expanded={linkOpen} disabled={busy} onClick={() => setLinkOpen(!linkOpen)}><Link2 size={17} /></button><button type="button" title="แนบรูปภาพหรือไฟล์" aria-label="แนบรูปภาพหรือไฟล์" disabled={busy || !listing.capabilities.attachments} onClick={() => fileRef.current?.click()}><Paperclip size={17} /></button><span className="announcement-editor-hint">จัดรูปแบบข้อความ</span>
          </div><textarea id="announcement-message" ref={editorRef} name="message" required maxLength={5000} rows={4} disabled={busy} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="เขียนรายละเอียดที่ต้องการแจ้งให้นักเรียนทราบ..." aria-describedby="announcement-message-count" /></div><small id="announcement-message-count" className="announcement-count">{message.length.toLocaleString("th-TH")}/5,000 ตัวอักษร</small>
            {linkOpen && <div className="announcement-link-insert"><input type="url" aria-label="ที่อยู่ลิงก์" placeholder="https://example.com" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); insertLink(); } }} /><button type="button" onClick={insertLink}>แทรก</button><button type="button" aria-label="ยกเลิกแทรกลิงก์" onClick={() => setLinkOpen(false)}><X size={16} /></button></div>}
          </div>
          <div className={`announcement-upload${dragging ? " is-dragging" : ""}${!listing.capabilities.attachments ? " is-unavailable" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!busy && listing.capabilities.attachments) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy && listing.capabilities.attachments) selectFiles(event.dataTransfer.files); }}><span className="announcement-upload-icon"><FileUp size={24} /></span><div><strong>แนบไฟล์ <span>(ถ้ามี)</span></strong><small>{listing.capabilities.attachments ? "JPG, PNG, WebP หรือ PDF · ไม่เกิน 10 MB/ไฟล์" : "พร้อมใช้งานหลังอัปเดตโครงสร้างฐานข้อมูล"}</small></div><button type="button" className="ann-secondary" disabled={busy || !listing.capabilities.attachments} onClick={() => fileRef.current?.click()}><Upload size={16} />เลือกไฟล์</button><input ref={fileRef} className="ann-file-input" type="file" hidden disabled={busy || !listing.capabilities.attachments} multiple accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="เลือกไฟล์แนบประกาศ" onChange={(event) => { if (event.target.files) selectFiles(event.target.files); }} /></div>
          {(files.length > 0 || retainedFiles.length > 0) && <ul className="announcement-files">{retainedFiles.map((file) => <li key={`saved-${file.id}`}><Paperclip size={15} /><a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a><small>{fileSize(file.size)}</small><button type="button" aria-label={`นำไฟล์ ${file.name} ออก`} disabled={busy} onClick={() => setRemovedFiles((current) => [...current, file.id])}><X size={15} /></button></li>)}{files.map((file, index) => <li key={`${file.name}-${index}`}><SelectedFileIcon file={file} /><span>{file.name}</span><small>{fileSize(file.size)}</small><button type="button" aria-label={`นำไฟล์ ${file.name} ออก`} disabled={busy} onClick={() => setFiles((current) => current.filter((_, i) => index !== i))}><X size={15} /></button></li>)}</ul>}
          <fieldset className="announcement-publish-settings" disabled={busy}><legend><AlarmClock size={17} />ตั้งค่าการเผยแพร่</legend><div className="announcement-publish-options"><label className={publishMode === "now" ? "is-selected" : ""}><input type="radio" name="publish-mode" value="now" checked={publishMode === "now"} onChange={() => setPublishMode("now")} /><span className="announcement-radio-icon">{publishMode === "now" ? <CheckCircle2 size={19} /> : <Circle size={19} />}</span><span><strong>เผยแพร่ทันที</strong><small>แสดงบน Dashboard หลังบันทึก</small></span></label><label className={`${publishMode === "scheduled" ? "is-selected" : ""}${!listing.capabilities.scheduling ? " is-disabled" : ""}`}><input type="radio" name="publish-mode" value="scheduled" disabled={!listing.capabilities.scheduling} checked={publishMode === "scheduled"} onChange={() => setPublishMode("scheduled")} /><span className="announcement-radio-icon">{publishMode === "scheduled" ? <CheckCircle2 size={19} /> : <Circle size={19} />}</span><span><strong>ตั้งเวลาเผยแพร่</strong><small>{listing.capabilities.scheduling ? "กำหนดวันและเวลาที่ต้องการ" : "ต้องอัปเดตฐานข้อมูลก่อน"}</small></span></label></div>{editing?.status === "hidden" && publishMode === "now" && <p className="announcement-hidden-note"><EyeOff size={14} />บันทึกการแก้ไขโดยคงสถานะซ่อนอยู่</p>}{publishMode === "scheduled" && <div className="announcement-schedule-fields"><label>วันที่เผยแพร่<input type="date" required value={date} onChange={(event) => { setDate(event.target.value); setScheduleCheckedAt(Date.now()); }} /></label><label>เวลา<input type="time" required value={time} onChange={(event) => { setTime(event.target.value); setScheduleCheckedAt(Date.now()); }} /></label><small>เวลาประเทศไทย (Asia/Bangkok · UTC+7)</small></div>}</fieldset>
          <ul className="announcement-readiness" aria-label="ความพร้อมของประกาศ">{[{ label: "หัวข้อ", complete: !!title.trim() }, { label: "เนื้อหา", complete: !!message.trim() }, { label: "การเผยแพร่", complete: publishMode === "now" || scheduleReady }].map(({ label, complete }) => <li key={label} className={complete ? "is-complete" : ""}>{complete ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}<span className="ann-sr-only">{complete ? "พร้อม: " : "รอข้อมูล: "}</span>{label}</li>)}</ul>
          <div className="announcement-form-actions"><button type="button" className="ann-secondary" disabled={busy || !(title || message || files.length || editing)} onClick={() => setConfirmation({ kind: "reset" })}><Trash2 size={17} />{editing ? "ยกเลิก" : "ล้างข้อมูล"}</button><button className="ann-primary" disabled={busy} type="submit">{busy ? <LoaderCircle size={18} className="announcement-spinner" /> : publishMode === "scheduled" ? <CalendarClock size={18} /> : <Send size={18} />}{busy ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : publishMode === "scheduled" ? "ตั้งเวลาเผยแพร่" : "เผยแพร่ประกาศ"}</button></div>
        </div>
      </form>

      <section className="announcement-library" ref={libraryRef} tabIndex={-1} aria-labelledby="library-heading" aria-busy={libraryView === "list" && loading}>
        <div className="announcement-library-top"><div className="announcement-section-heading"><span className="announcement-section-icon">{libraryView === "preview" ? <Eye size={23} aria-hidden="true" /> : <FileText size={23} aria-hidden="true" />}</span><div><h2 id="library-heading">{libraryView === "preview" ? "ตัวอย่างก่อนเผยแพร่" : <>รายการประกาศ <span>({stats.total.toLocaleString("th-TH")})</span></>}</h2><p>{libraryView === "preview" ? "ตรวจข้อความและไฟล์แนบก่อนส่งถึงนักเรียน" : "จัดการประกาศ ข่าวสาร และการแสดงผล"}</p></div></div>{libraryView === "list" && <div className="announcement-search"><Search size={18} /><input type="search" aria-label="ค้นหาประกาศ" placeholder="ค้นหาหัวข้อหรือเนื้อหาประกาศ..." value={queryInput} onChange={(event) => setQueryInput(event.target.value)} />{queryInput && <button type="button" aria-label="ล้างคำค้นหา" onClick={() => setQueryInput("")}><X size={15} /></button>}</div>}</div>
        <div className="announcement-view-switch" role="group" aria-label="มุมมองประกาศ"><button type="button" aria-pressed={libraryView === "list"} onClick={() => setLibraryView("list")}><List size={17} aria-hidden="true" />รายการประกาศ</button><button type="button" aria-pressed={libraryView === "preview"} onClick={() => setLibraryView("preview")}><Eye size={17} aria-hidden="true" />ตัวอย่างก่อนเผยแพร่</button></div>
        {libraryView === "preview" ? <section className="announcement-draft-preview" aria-labelledby="draft-heading"><div className="announcement-draft-heading"><Eye size={19} aria-hidden="true" /><h3 id="draft-heading">ตัวอย่างประกาศ</h3><span className="announcement-draft-badge">{editing ? "การแก้ไขยังไม่บันทึก" : "ยังไม่เผยแพร่"}</span></div><p className="announcement-draft-description">ตัวอย่างเปลี่ยนตามข้อความที่เขียน ลองจัดรูปแบบหรือแนบไฟล์ได้เลย</p><div className="announcement-draft-body"><h4 className={!title.trim() ? "announcement-draft-placeholder" : undefined}>{title.trim() || "หัวข้อประกาศของคุณจะแสดงที่นี่"}</h4>{message.trim() ? <AnnouncementContent message={message} /> : <p className="announcement-draft-placeholder">เริ่มพิมพ์เนื้อหาในแบบฟอร์ม หรือเลือกแม่แบบเพื่อดูตัวอย่างประกาศ</p>}{(files.length > 0 || retainedFiles.length > 0) && <ul className="announcement-draft-attachments" aria-label="ตัวอย่างไฟล์แนบ">{retainedFiles.map((file) => <li key={`saved-${file.id}`}><FileText size={21} aria-hidden="true" /><a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a><small>{fileSize(file.size)}</small></li>)}{files.map((file, index) => <li key={`${file.name}-${index}`}><SelectedFileIcon file={file} /><span>{file.name}</span><small>{fileSize(file.size)}</small></li>)}</ul>}</div><div className="announcement-draft-footer">{publishMode === "scheduled" ? <CalendarClock size={17} aria-hidden="true" /> : editing?.status === "hidden" ? <EyeOff size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}<span>{publishSummary}</span></div></section> : <>
        <div className="announcement-library-controls"><div className="announcement-filters" role="group" aria-label="กรองสถานะประกาศ">{tabs.map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => { setFilter(option.value); setPage(1); }}>{option.label}<span>{option.count.toLocaleString("th-TH")}</span></button>)}</div><label className="announcement-sort"><ArrowDownUp size={15} /><span className="ann-sr-only">เรียงประกาศ</span><select value={sort} onChange={(event) => { setSort(event.target.value as Sort); setPage(1); }}><option value="newest">ล่าสุดก่อน</option><option value="oldest">เก่าสุดก่อน</option><option value="title">ตามชื่อประกาศ</option></select></label></div>
        <div className="announcements-list" aria-live="polite">
          {loading ? <div className="announcement-skeleton" role="status" aria-label="กำลังโหลดประกาศ">{[1, 2, 3].map((item) => <div key={item}><span /><span /><span /></div>)}</div> : listing.announcements.length ? listing.announcements.map((item) => <article key={item.id} className="announcement-item"><div className="announcement-item-top"><span className={`announcement-status is-${item.status || (item.published ? "published" : "hidden")}`}>{item.status === "scheduled" ? <Clock3 size={13} /> : item.published ? <CheckCircle2 size={13} /> : <EyeOff size={13} />}{statusLabels[item.status || (item.published ? "published" : "hidden")]}</span><time>{localDate(item.createdAt)}</time><div className="announcement-item-menu"><button type="button" className="ann-icon-button" aria-label={`จัดการประกาศ ${item.title}`} aria-expanded={menuId === item.id} onClick={() => setMenuId(menuId === item.id ? null : item.id)} disabled={busy}><MoreHorizontal size={20} /></button>{menuId === item.id && <div className="announcement-action-menu"><button type="button" onClick={() => { setPreview(item); setMenuId(null); }}><Eye size={16} />ดูรายละเอียด</button><button type="button" onClick={() => editItem(item, Date.now())}><Pencil size={16} />แก้ไขประกาศ</button><button type="button" onClick={() => void save({ id: item.id, published: item.status === "hidden" }, "PATCH", item.status === "hidden" ? "เผยแพร่ประกาศเรียบร้อยแล้ว" : "ซ่อนประกาศเรียบร้อยแล้ว")}>{item.status === "hidden" ? <Eye size={16} /> : <EyeOff size={16} />}{item.status === "hidden" ? "เผยแพร่อีกครั้ง" : "ซ่อนประกาศ"}</button><button type="button" className="is-danger" onClick={() => { setConfirmation({ kind: "delete", item }); setMenuId(null); }}><Trash2 size={16} />ลบประกาศ</button></div>}</div></div><button type="button" className="announcement-item-title" onClick={() => setPreview(item)}><h3>{item.title}</h3></button><div className="announcement-item-preview"><AnnouncementContent message={item.message} compact /></div><div className="announcement-item-footer"><span>{item.createdBy || "ผู้ดูแลระบบ"}</span>{item.status === "scheduled" && item.scheduledAt && <span><CalendarClock size={13} />{localDate(item.scheduledAt)}</span>}{item.attachments?.length > 0 && <button type="button" onClick={() => setPreview(item)}><Paperclip size={14} />{item.attachments.length} ไฟล์แนบ</button>}</div></article>) : <div className="announcement-empty"><div className="announcement-empty-art" aria-hidden="true"><span className="announcement-empty-orbit" /><Megaphone size={68} strokeWidth={1.5} /><span className="announcement-empty-paper"><FileText size={23} strokeWidth={1.6} /></span></div><h3>{stats.total ? "ไม่พบประกาศที่ตรงกัน" : "ยังไม่มีประกาศในระบบ"}</h3><p>{stats.total ? "ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น" : <>เริ่มต้นด้วยการเขียนประกาศแรก เพื่อให้นักเรียนเห็นบน Dashboard<br />พร้อมแนบรูปภาพหรือไฟล์ที่สำคัญ</>}</p><button type="button" className="ann-primary" onClick={stats.total ? clearFilters : focusComposer}>{stats.total ? <X size={18} /> : <Plus size={19} />}{stats.total ? "ล้างตัวกรอง" : "เขียนประกาศใหม่"}</button></div>}
        </div>
        <div className="announcement-pagination"><p>แสดง <strong>{first.toLocaleString("th-TH")}{first !== last ? `–${last.toLocaleString("th-TH")}` : ""}</strong> จาก <strong>{listing.total.toLocaleString("th-TH")}</strong> ประกาศที่พบ</p><div><label><span className="ann-sr-only">จำนวนรายการต่อหน้า</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>แสดง 10</option><option value={20}>แสดง 20</option><option value={50}>แสดง 50</option></select></label><button type="button" aria-label="หน้าก่อนหน้า" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button><span className="announcement-current-page" aria-label={`หน้า ${page} จาก ${pages}`}>{page}</span><button type="button" aria-label="หน้าถัดไป" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button></div></div>
        </>}
      </section>
    </div>
    {confirmation && <Modal title={confirmation.kind === "reset" ? "ล้างข้อมูลในแบบฟอร์ม?" : confirmation.kind === "template" ? `ใช้แม่แบบ${confirmation.template.label}?` : "ลบประกาศนี้?"} onClose={() => { if (!busy) setConfirmation(null); }}><p className="announcement-dialog-description">{confirmation.kind === "reset" ? "ข้อมูลที่ยังไม่ได้บันทึกจะถูกล้างออกจากแบบฟอร์ม" : confirmation.kind === "template" ? "หัวข้อและเนื้อหาที่เขียนไว้จะถูกแทนที่ด้วยแม่แบบ ไฟล์แนบและการตั้งเวลาเผยแพร่จะคงเดิม" : <>ประกาศ “{confirmation.item.title}” จะถูกลบออกจากระบบ และไม่แสดงบน Dashboard ของนักเรียน</>}</p><div className="announcement-dialog-actions"><button className="ann-secondary" type="button" disabled={busy} onClick={() => setConfirmation(null)}>ยกเลิก</button><button type="button" className={confirmation.kind === "delete" ? "ann-danger" : "ann-primary"} disabled={busy} onClick={async () => { if (confirmation.kind === "reset") { resetForm(); setConfirmation(null); } else if (confirmation.kind === "template") { applyTemplate(confirmation.template); setConfirmation(null); } else if (await save({ id: confirmation.item.id }, "DELETE", "ลบประกาศเรียบร้อยแล้ว")) { if (editing?.id === confirmation.item.id) resetForm(); setConfirmation(null); } }}>{busy ? "กำลังบันทึก..." : confirmation.kind === "reset" ? "ล้างข้อมูล" : confirmation.kind === "template" ? "ใช้แม่แบบนี้" : "ยืนยันการลบ"}</button></div></Modal>}
    {preview && <Modal title={preview.title} onClose={() => setPreview(null)}><div className="announcement-preview-meta"><span className={`announcement-status is-${preview.status}`}>{statusLabels[preview.status]}</span><time>{localDate(preview.createdAt)}</time></div><AnnouncementContent message={preview.message} /><div className="announcement-preview-files">{preview.attachments?.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer"><FileText size={20} /><span>{file.name}<small>{fileSize(file.size)}</small></span><ChevronRight size={17} /></a>)}</div></Modal>}
  </main>;
}
