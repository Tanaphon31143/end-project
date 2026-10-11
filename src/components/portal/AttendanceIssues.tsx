"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AttendanceIssue } from "@/lib/attendance-issues";
import { showActionError, showActionSuccess } from "@/lib/sweet-alert";
import styles from "./AttendanceIssues.module.css";
const labels = { PENDING: "รอตรวจสอบ", REVIEWING: "กำลังตรวจสอบ", COMPLETED: "เสร็จสิ้น", REJECTED: "ปฏิเสธ" };
export function AttendanceIssues({ initial }: { initial: AttendanceIssue[] }) {
  const router = useRouter();
  const [issues, setIssues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Record<number, Array<{ id: number | string; name: string }>>>({});
  async function loadAttachments(id: number) {
    try {
      const response = await fetch(`/api/attendance-issues/${id}/attachments`, { cache: "no-store" });
      if (!response.ok) throw new Error("โหลดหลักฐานไม่สำเร็จ");
      const result = await response.json();
      setAttachments(previous => ({ ...previous, [id]: result.attachments }));
    } catch (error) { void showActionError(error instanceof Error ? error.message : "โหลดหลักฐานไม่สำเร็จ"); }
  }
  const [drafts, setDrafts] = useState<Record<number, { status: string; resolution: string }>>({});
  async function save(issue: AttendanceIssue) {
    const draft = drafts[issue.id];
    if (!draft || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/attendance-issues", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: issue.id, expectedStatus: issue.status, expectedUpdatedAt: issue.updatedAt, expectedResolution: issue.resolution, ...draft }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      const refreshed = await fetch("/api/attendance-issues", { cache: "no-store" });
      if (!refreshed.ok) throw new Error("บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรชหน้า");
      setIssues((await refreshed.json()).issues);
      setDrafts({});
      router.refresh();
      void showActionSuccess(result.message);
    } catch (error) { void showActionError(error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel}>
    <h2>คำร้องปัญหาการเข้าเรียน</h2><p>ตรวจสอบคำร้องจากนักเรียน · ผลบันทึกจะแสดงในบัญชีนักเรียน การปิดคำร้องไม่เปลี่ยนสถานะเข้าเรียนอัตโนมัติ</p>
    {!issues.length && <p>ไม่มีคำร้องในรายวิชาที่คุณดูแล</p>}
    {issues.map(issue => {
      const draft = drafts[issue.id] || { status: issue.status === "PENDING" ? "REVIEWING" : issue.status, resolution: issue.resolution };
      return <details key={issue.id} className={styles.item}><summary><strong>{issue.studentCode} · {issue.studentName}</strong><span>{issue.subjectName} · {issue.incidentDate}</span><b>{labels[issue.status]}</b></summary>
        <div className={styles.body}><p><strong>{issue.issueType}</strong> · {issue.classTime} · {issue.room}</p><p className={styles.details}>{issue.details}</p>
          <div><button type="button" onClick={() => void loadAttachments(issue.id)}>ดูหลักฐานแนบ</button>{attachments[issue.id]?.map(file => <p key={file.id}><a target="_blank" rel="noopener noreferrer" href={`/api/attendance-issues/${issue.id}/attachments?id=${encodeURIComponent(file.id)}`}>{file.name}</a></p>)}{attachments[issue.id]?.length === 0 && <p>ไม่มีหลักฐานแนบ</p>}</div>
          <label>สถานะ<select disabled={busy} value={draft.status} onChange={event => setDrafts({ ...drafts, [issue.id]: { ...draft, status: event.target.value } })}>{["REVIEWING", "COMPLETED", "REJECTED"].map(status => <option key={status} value={status}>{labels[status as keyof typeof labels]}</option>)}</select></label>
          <label>ผลการตรวจสอบ<textarea disabled={busy} maxLength={3000} rows={3} value={draft.resolution} onChange={event => setDrafts({ ...drafts, [issue.id]: { ...draft, resolution: event.target.value } })} placeholder="อธิบายผลตรวจสอบหรือเหตุผลที่ปฏิเสธ" /></label>
          <button type="button" disabled={busy || !drafts[issue.id]} onClick={() => void save(issue)}>{busy ? "กำลังบันทึก…" : "บันทึกผลตรวจสอบ"}</button>
        </div></details>;
    })}
  </section>;
}
