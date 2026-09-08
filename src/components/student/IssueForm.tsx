"use client";
import { useState } from "react";
import { ImagePlus, Send, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
type Course = { id: number; name: string; room: string; startTime: string };
export default function IssueForm({ courses }: { courses: Course[] }) {
  const router = useRouter(),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSent(false);
    setMessage("");
    const response = await fetch("/api/student/reports", {
        method: "POST",
        body: new FormData(event.currentTarget),
      }),
      data = (await response.json()) as { message?: string };
    setBusy(false);
    setMessage(data.message || "");
    if (response.ok) {
      setSent(true);
      event.currentTarget.reset();
      setSelected("");
      router.refresh();
    }
  }
  const course = courses.find((x) => String(x.id) === selected);
  return (
    <form className="report-form" onSubmit={submit}>
      {message && (
        <div className={sent ? "form-success" : "form-error"}>
          {sent && <CheckCircle2 size={20} />} {message}
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label>วันที่เกิดปัญหา</label>
          <input required className="input" name="incidentDate" type="date" />
        </div>
        <div className="field">
          <label>รายวิชา</label>
          <select
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
          <label>เวลาเรียน</label>
          <input
            required
            className="input"
            name="classTime"
            type="time"
            defaultValue={course?.startTime}
          />
        </div>
        <div className="field">
          <label>ห้องเรียน</label>
          <input
            required
            className="input"
            name="room"
            defaultValue={course?.room}
            placeholder="เช่น Lab 3"
            key={course?.id}
          />
        </div>
        <div className="field full">
          <label>ประเภทปัญหา</label>
          <select required className="select" name="issueType" defaultValue="">
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
          <label>รายละเอียดปัญหา</label>
          <textarea
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
            <small>JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB</small>
          </span>
          <input
            name="attachment"
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
