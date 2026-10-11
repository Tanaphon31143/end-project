"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, CheckCircle2, Eye, EyeOff, LoaderCircle, Megaphone, Search, Send, X } from "lucide-react";
import type { Announcement } from "@/lib/announcements";
import "./AnnouncementsManager.css";

type Filter = "all" | "published" | "hidden";

export default function AnnouncementsManager({ initial }: { initial: Announcement[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const published = items.filter((item) => item.published).length;
  const visibleItems = items.filter((item) =>
    (filter === "all" || item.published === (filter === "published")) &&
    `${item.title} ${item.message}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  async function save(body: object, method: string) {
    setBusy(true); setFeedback(""); setError(false);
    try {
      const response = await fetch("/api/admin/announcements", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setItems(data.announcements); setFeedback("บันทึกประกาศเรียบร้อยแล้ว"); return true;
    } catch (e) { setError(true); setFeedback(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่"); return false; }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await save({ title, message }, "POST")) {
      setTitle(""); setMessage(""); setQuery(""); setFilter("all");
    }
  }

  return (
    <main className="admin-content announcements-manager" aria-labelledby="announcements-heading">
      <header className="announcements-heading">
        <div>
          <h1 id="announcements-heading">ประกาศจากโรงเรียน</h1>
          <p>เผยแพร่ข่าวสารให้นักเรียนเห็นบน Dashboard</p>
        </div>
        <div className="announcements-summary" aria-label="สรุปประกาศที่โหลด">
          <span><span className="announcement-dot" />เผยแพร่แล้ว <strong>{published}</strong></span>
          <span>ซ่อนอยู่ <strong>{items.length - published}</strong></span>
        </div>
      </header>

      {feedback && <p className={`announcement-feedback${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
        {!error && <CheckCircle2 size={18} aria-hidden="true" />}{feedback}
      </p>}

      <div className="announcements-workspace">
        <form className="announcement-composer" onSubmit={submit} aria-labelledby="composer-heading">
          <div className="announcement-section-heading">
            <span className="announcement-section-icon"><Megaphone size={20} aria-hidden="true" /></span>
            <div><h2 id="composer-heading">เขียนประกาศใหม่</h2><p>ส่งข่าวสารถึงนักเรียนในโรงเรียน</p></div>
          </div>
          <label className="announcement-field">
            <span>หัวข้อประกาศ <span className="announcement-required">*</span></span>
            <input name="title" required maxLength={180} disabled={busy} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="ระบุหัวข้อให้สั้นและชัดเจน" />
          </label>
          <label className="announcement-field">
            <span>เนื้อหาประกาศ <span className="announcement-required">*</span></span>
            <textarea name="message" required maxLength={5000} rows={8} disabled={busy} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="เขียนรายละเอียดที่ต้องการแจ้งให้นักเรียนทราบ…" aria-describedby="announcement-message-count" />
            <small id="announcement-message-count" className="announcement-count">{message.length.toLocaleString()} / 5,000 ตัวอักษร</small>
          </label>
          <div className="announcement-publish-note"><Eye size={17} aria-hidden="true" /><p>เมื่อเผยแพร่ นักเรียนจะเห็นประกาศนี้บน Dashboard</p></div>
          <button className="announcement-publish" disabled={busy} type="submit">
            {busy ? <LoaderCircle size={18} className="announcement-spinner" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
            {busy ? "กำลังบันทึก..." : "เผยแพร่ประกาศ"}
            {!busy && <ArrowUpRight size={18} aria-hidden="true" />}
          </button>
        </form>

        <section className="announcement-library" aria-labelledby="library-heading">
          <div className="announcement-library-heading"><h2 id="library-heading">รายการประกาศ <span>{items.length}</span></h2><p>จัดการข่าวสารและการแสดงผล</p></div>
          <div className="announcement-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="ค้นหาประกาศ" placeholder="ค้นหาหัวข้อหรือเนื้อหาประกาศ" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <div className="announcement-filters" role="group" aria-label="กรองสถานะประกาศ">
            {([{ value: "all", label: "ทั้งหมด", count: items.length }, { value: "published", label: "เผยแพร่แล้ว", count: published }, { value: "hidden", label: "ซ่อนอยู่", count: items.length - published }] as const).map((option) =>
              <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}<span>{option.count}</span></button>
            )}
          </div>
          <div className="announcements-list" aria-live="polite">
            {visibleItems.map((item) => <article key={item.id} className="announcement-item">
              <div className="announcement-item-meta"><span className={`announcement-status${item.published ? " is-published" : ""}`}>{item.published ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}{item.published ? "เผยแพร่แล้ว" : "ซ่อนอยู่"}</span><time dateTime={item.createdAt.replace(" ", "T")}>{item.createdAt}</time></div>
              <h3>{item.title}</h3><p className="announcement-message">{item.message}</p>
              <button type="button" className="announcement-toggle" disabled={busy} onClick={() => void save({ id: item.id, published: !item.published }, "PATCH")}>{item.published ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{item.published ? "ซ่อนประกาศ" : "เผยแพร่อีกครั้ง"}</button>
            </article>)}
            {!visibleItems.length && <div className="announcement-empty">
              <span className="announcement-empty-icon">{items.length ? <Search size={28} aria-hidden="true" /> : <Megaphone size={28} aria-hidden="true" />}</span>
              <h3>{items.length ? "ไม่พบประกาศที่ตรงกัน" : "เริ่มต้นข่าวสารแรกของโรงเรียน"}</h3>
              <p>{items.length ? "ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น" : "เขียนประกาศในแบบฟอร์ม แล้วเผยแพร่ให้นักเรียนรับทราบได้ทันที"}</p>
              {items.length > 0 && <button type="button" className="announcement-toggle" onClick={() => { setQuery(""); setFilter("all"); }}><X size={16} aria-hidden="true" />ล้างตัวกรอง</button>}
            </div>}
          </div>
          <p className="announcement-library-footnote">แสดง {visibleItems.length} จาก {items.length} ประกาศที่โหลด · สูงสุด 100 รายการล่าสุด</p>
        </section>
      </div>
    </main>
  );
}

