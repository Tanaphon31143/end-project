"use client";
import { useState } from "react";
import { ImagePlus, Send, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStudentToast } from "./StudentToast";
type Course = { id: number; name: string; room: string; startTime: string };
export default function IssueForm({ courses }: { courses: Course[] }) {
  const notify = useStudentToast();
  const router = useRouter(),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setSent(false);
    setMessage("");
    try {
    const response = await fetch("/api/student/reports", {
        method: "POST",
        body: new FormData(form),
      }),
      data = (await response.json()) as { message?: string };
    setBusy(false);
    setMessage(data.message || "");
    if (response.ok) {
      notify(data.message || "ส่งคำร้องเรียบร้อยแล้ว");
      setSent(true);
      form.reset();
      setSelected("");
      router.refresh();
    } else {
      notify(data.message || "ส่งคำร้องไม่สำเร็จ", "error");
    }
    } catch {
      notify("เชื่อมต่อไม่สำเร็จ กรุณาลองส่งคำร้องใหม่", "error");
      setMessage("เชื่อมต่อไม่สำเร็จ กรุณาลองส่งคำร้องใหม่");
    } finally { setBusy(false); }
  }
  const course = courses.find((x) => String(x.id) === selected);
  return (
    <form className="report-form" onSubmit={submit}>
      {message && (
        <div role="status" className={sent ? "form-success" : "form-error"}>
          {sent && <CheckCircle2 size={20} />} {message}
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="issue-date">วันที่เกิดปัญหา</label>
          <input id="issue-date" required className="input" name="incidentDate" type="date" />
        </div>
        <div className="field">
          <label htmlFor="issue-subject">รายวิชา</label>
          <select
            id="issue-subject"
            required
            className="select"
            name="subjectId"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="" disabled>
              เลือกรายวิชา
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="issue-time">เวลาเรียน</label>
          <input
            id="issue-time"
            required
            className="input"
            name="classTime"
            type="time"
            defaultValue={course?.startTime}
            key={course?.id}
          />
        </div>
        <div className="field">
          <label htmlFor="issue-room">ห้องเรียน</label>
          <input
            id="issue-room"
            required
            className="input"
            name="room"
            defaultValue={course?.room}
            placeholder="เช่น Lab 3"
            key={course?.id}
          />
        </div>
        <div className="field full">
          <label htmlFor="issue-type">ประเภทปัญหา</label>
          <select id="issue-type" required className="select" name="issueType" defaultValue="">
            <option value="" disabled>
              เลือกประเภทปัญหา
            </option>
            {[
              "สแกนสำเร็จแต่สถานะเป็นขาด",
              "สแกนไม่ติด",
              "ไม่พบใบหน้า",
              "ระบบไม่เปิดกล้อง",
              "เช็คชื่อผิดเวลา",
              "อื่น ๆ",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label htmlFor="issue-details">รายละเอียดปัญหา</label>
          <textarea
            id="issue-details"
            required
            minLength={10}
            maxLength={3000}
            className="textarea"
            name="details"
            placeholder="อธิบายเหตุการณ์ เวลาที่เกิดปัญหา และข้อความที่ระบบแสดง"
          />
        </div>
        <label className="upload full">
          <ImagePlus size={25} />
          <span>
            <b>แนบรูปภาพประกอบ</b>
            <small>สูงสุด 5 รูป JPG, PNG หรือ WebP รูปละไม่เกิน 5 MB</small>
          </span>
          <input
            name="attachments"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.setCustomValidity(files.length > 5 || files.some(file => file.size > 5 * 1024 * 1024)
                ? 'แนบได้สูงสุด 5 รูป รูปละไม่เกิน 5 MB' : '');
              event.target.reportValidity();
            }}
            disabled={busy}
            aria-label="แนบรูปภาพประกอบ สูงสุด 5 รูป"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
      </div>
      <div className="form-actions">
        <button
          className="button primary"
          type="submit"
          disabled={busy || !courses.length}
        >
          <Send size={17} /> {busy ? "กำลังส่ง..." : "ส่งคำร้อง"}
        </button>
      </div>
    </form>
  );
}
