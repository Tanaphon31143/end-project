"use client";

import { CheckCircle2, ImagePlus, Send, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStudentToast } from "./StudentToast";
import ReportTicket from "./ReportTicket";

type Course = { id: number; name: string; room: string; startTime: string };
type FilePreview = { file: File; url: string };
type Errors = Partial<Record<"date" | "subject" | "issueType" | "details", string>>;
const issueTypes = ["สแกนสำเร็จแต่สถานะเป็นขาด", "สแกนไม่ติด", "ไม่พบใบหน้า", "ระบบไม่เปิดกล้อง", "เช็คชื่อผิดเวลา", "อื่น ๆ"];

export default function IssueForm({ courses, initialSubject = "", initialDate = "" }: { courses: Course[]; initialSubject?: string; initialDate?: string }) {
  const notify = useStudentToast();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sent, setSent] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const initialCourse = courses.find((item) => String(item.id) === initialSubject);
  const [incidentDate, setIncidentDate] = useState(initialDate), [selected, setSelected] = useState(initialSubject);
  const [classTime, setClassTime] = useState(initialCourse?.startTime || ""), [room, setRoom] = useState(initialCourse?.room || ""), [issueType, setIssueType] = useState(""), [details, setDetails] = useState("");
  const [files, setFiles] = useState<FilePreview[]>([]), [dragging, setDragging] = useState(false), [errors, setErrors] = useState<Errors>({});
  const filesRef = useRef<FilePreview[]>([]);
  const course = courses.find((item) => String(item.id) === selected);

  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => () => filesRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  function clearError(key: keyof Errors) { if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined })); }
  function addFiles(incoming: File[]) {
    const valid = incoming.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (incoming.length > valid.length) notify("แนบได้เฉพาะ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB", "error");
    if (files.length + valid.length > 5) { notify("แนบรูปได้สูงสุด 5 รูป", "error"); return; }
    setFiles((current) => [...current, ...valid.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }
  function pickFiles(event: ChangeEvent<HTMLInputElement>) { addFiles(Array.from(event.target.files || [])); event.target.value = ""; }
  function dropFiles(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)); }
  function removeFile(index: number) { setFiles((current) => { URL.revokeObjectURL(current[index].url); return current.filter((_, itemIndex) => itemIndex !== index); }); }
  function validate() {
    const next: Errors = {};
    if (!incidentDate) next.date = "เลือกวันที่เกิดปัญหา";
    if (!selected) next.subject = "เลือกรายวิชา";
    if (!issueType) next.issueType = "เลือกประเภทปัญหา";
    if (details.trim().length < 10) next.details = "เขียนรายละเอียดอย่างน้อย 10 ตัวอักษร";
    setErrors(next);
    const first = Object.keys(next)[0] as keyof Errors | undefined;
    if (first) document.getElementById(`issue-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !first;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!validate()) return;
    const form = event.currentTarget; setBusy(true); setSent(false); setMessage("");
    try {
      const payload = new FormData(form); payload.delete("attachments"); files.forEach(({ file }) => payload.append("attachments", file));
      const response = await fetch("/api/student/reports", { method: "POST", body: payload });
      const data = (await response.json()) as { message?: string };
      setMessage(data.message || "");
      if (response.ok) { notify(data.message || "ส่งคำร้องเรียบร้อยแล้ว"); setSent(true); form.reset(); setIncidentDate(""); setSelected(""); setClassTime(""); setRoom(""); setIssueType(""); setDetails(""); files.forEach((item) => URL.revokeObjectURL(item.url)); setFiles([]); router.refresh(); }
      else notify(data.message || "ส่งคำร้องไม่สำเร็จ", "error");
    } catch { setMessage("เชื่อมต่อไม่สำเร็จ กรุณาลองส่งคำร้องใหม่"); notify("เชื่อมต่อไม่สำเร็จ กรุณาลองส่งคำร้องใหม่", "error"); }
    finally { setBusy(false); }
  }
  return (
    <div className="report-compose">
      <section className="card card-pad report-card report-form-card">
        <div className="report-card-heading"><span className="report-step">01</span><div><h2>รายละเอียดปัญหา</h2><p>กรอกข้อมูลให้ครบถ้วนเพื่อช่วยให้ตรวจสอบได้รวดเร็วขึ้น</p></div></div>
        <form className="report-form" onSubmit={submit} noValidate>
          {message && <div role="status" className={sent ? "form-success" : "form-error"}>{sent && <CheckCircle2 size={20} />}{message}</div>}
          <div className="form-grid">
            <div className="field"><label htmlFor="issue-date">วันที่เกิดปัญหา</label><input id="issue-date" required className="input" name="incidentDate" type="date" value={incidentDate} onChange={(event) => { setIncidentDate(event.target.value); clearError("date"); }} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "issue-date-error" : undefined} />{errors.date && <small id="issue-date-error" className="report-field-error">{errors.date}</small>}</div>
            <div className="field"><label htmlFor="issue-subject">รายวิชา</label><select id="issue-subject" required className="select" name="subjectId" value={selected} onChange={(event) => { const next = courses.find((item) => String(item.id) === event.target.value); setSelected(event.target.value); setClassTime(next?.startTime || ""); setRoom(next?.room || ""); clearError("subject"); }} aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? "issue-subject-error" : undefined}><option value="" disabled>เลือกรายวิชา</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.subject && <small id="issue-subject-error" className="report-field-error">{errors.subject}</small>}</div>
            <div className="field"><label htmlFor="issue-time">เวลาเรียน</label><input id="issue-time" required className="input" name="classTime" type="time" value={classTime} onChange={(event) => setClassTime(event.target.value)} /></div>
            <div className="field"><label htmlFor="issue-room">ห้องเรียน</label><input id="issue-room" required className="input" name="room" value={room} onChange={(event) => setRoom(event.target.value)} placeholder="เช่น Lab 3" /></div>
            <fieldset id="issue-issueType" className="field full report-chip-field" aria-describedby={errors.issueType ? "issue-type-error" : undefined}><legend>ประเภทปัญหา</legend><div className="report-chips" role="radiogroup" aria-label="ประเภทปัญหา">{issueTypes.map((item) => <button key={item} type="button" role="radio" aria-checked={issueType === item} className={issueType === item ? "is-selected" : ""} onClick={() => { setIssueType(item); clearError("issueType"); }}>{item}</button>)}</div>{errors.issueType && <small id="issue-type-error" className="report-field-error">{errors.issueType}</small>}<input type="hidden" name="issueType" value={issueType} /></fieldset>
            <div className="field full"><label htmlFor="issue-details">รายละเอียดปัญหา</label><div className="report-textarea-wrap"><textarea id="issue-details" required minLength={10} maxLength={3000} className="textarea" name="details" value={details} onChange={(event) => { setDetails(event.target.value); clearError("details"); }} placeholder="อธิบายเหตุการณ์ เวลาที่เกิดปัญหา และข้อความที่ระบบแสดง" aria-invalid={Boolean(errors.details)} aria-describedby={errors.details ? "issue-details-error" : undefined} /><span>{details.length}/3000</span></div>{errors.details && <small id="issue-details-error" className="report-field-error">{errors.details}</small>}</div>
            <div className={`report-dropzone full${dragging ? " is-dragging" : ""}`} role="button" tabIndex={0} onClick={() => fileInput.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInput.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={dropFiles}>
              <input ref={fileInput} name="attachments" multiple onChange={pickFiles} disabled={busy} aria-label="แนบรูปภาพประกอบ สูงสุด 5 รูป" type="file" accept="image/jpeg,image/png,image/webp" />
              <ImagePlus size={26} /><span><b>แนบรูปภาพประกอบ</b><small>ลากไฟล์มาวาง หรือคลิกเพื่อเลือก · สูงสุด 5 รูป รูปละไม่เกิน 5 MB</small></span>
              {files.length > 0 && <div className="report-file-previews">{files.map((item, index) => <span key={item.url}><Image unoptimized width={64} height={64} src={item.url} alt={`รูปแนบ ${index + 1}`} /><button type="button" aria-label={`ลบรูปแนบ ${index + 1}`} onClick={(event) => { event.stopPropagation(); removeFile(index); }}><X size={13} /></button></span>)}</div>}
            </div>
          </div>
          <div className="form-actions"><small>ตั๋วทางขวาจะอัปเดตตามที่คุณกรอก</small><button className="button primary report-submit" type="submit" disabled={busy || !courses.length} aria-busy={busy}><Send size={17} /> {busy ? "กำลังส่ง..." : "ส่งคำร้อง"}</button></div>
        </form>
      </section>
      <ReportTicket ticketId="TK-0001" date={incidentDate} time={classTime} room={room} subject={course?.name || ""} issueType={issueType} details={details} attachmentCount={files.length} sent={sent} />
    </div>
  );
}
