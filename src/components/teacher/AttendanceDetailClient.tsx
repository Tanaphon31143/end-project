"use client";

import { useState } from "react";
import { Check, LoaderCircle, Pencil, X } from "lucide-react";

type Status = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
type StudentRow = {
  id: number;
  code: string;
  name: string;
  status: Status | null;
  checkInTime: string;
  confidence: number | null;
};
const labels: Record<Status, string> = {
  PRESENT: "เข้าเรียน",
  LATE: "มาสาย",
  ABSENT: "ขาดเรียน",
  LEAVE: "ลา",
};

export function AttendanceDetailClient({
  sessionId,
  students,
}: {
  sessionId: string;
  students: StudentRow[];
}) {
  const [rows, setRows] = useState(students);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [status, setStatus] = useState<Status>("PRESENT");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function open(row: StudentRow) {
    setEditing(row);
    setStatus(row.status ?? "PRESENT");
    setReason("");
    setError("");
    setMessage("");
  }
  async function save() {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          studentId: editing.id,
          status,
          reason,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "บันทึกสถานะไม่สำเร็จ");
      const checkInTime = data.record.checkInTime
        ? new Intl.DateTimeFormat("th-TH", {
            timeStyle: "medium",
            timeZone: "Asia/Bangkok",
          }).format(new Date(data.record.checkInTime))
        : "-";
      setRows((current) =>
        current.map((row) =>
          row.id === editing.id ? { ...row, status, checkInTime } : row,
        ),
      );
      setEditing(null);
      setMessage(`บันทึกสถานะของ ${editing.name} แล้ว`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {message && (
        <p className="form-message success" role="status">
          {message}
        </p>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>รหัสนักเรียน</th>
              <th>ชื่อ–นามสกุล</th>
              <th>เวลาเช็คชื่อ</th>
              <th>สถานะ</th>
              <th>ความมั่นใจ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((student) => (
                <tr key={student.id}>
                  <td>{student.code}</td>
                  <td>
                    <b>{student.name}</b>
                  </td>
                  <td>{student.checkInTime}</td>
                  <td>
                    {student.status ? (
                      <span className={`status ${student.status}`}>
                        {labels[student.status]}
                      </span>
                    ) : (
                      <span className="status pending">ยังไม่เช็คชื่อ</span>
                    )}
                  </td>
                  <td>
                    {student.confidence === null
                      ? "-"
                      : `${student.confidence.toFixed(1)}%`}
                  </td>
                  <td>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => open(student)}
                    >
                      <Pencil size={15} />
                      แก้ไขสถานะ
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="empty">ยังไม่มีนักเรียนในห้องนี้</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving)
              setEditing(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-edit-title"
          >
            <div className="panel-head">
              <div>
                <h3 id="attendance-edit-title">แก้ไขสถานะรายคน</h3>
                <span className="muted">
                  {editing.code} · {editing.name}
                </span>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="ปิด"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>
            <div className="field">
              <label htmlFor="attendance-status">สถานะ</label>
              <select
                id="attendance-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as Status)}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="attendance-reason">เหตุผลในการแก้ไข</label>
              <textarea
                id="attendance-reason"
                value={reason}
                minLength={3}
                maxLength={500}
                rows={4}
                onChange={(event) => setReason(event.target.value)}
                placeholder="เช่น ครูตรวจสอบหลักฐานการลาแล้ว"
              />
            </div>
            {error && (
              <p className="form-message error" role="alert">
                {error}
              </p>
            )}
            <div className="course-actions">
              <button
                className="button ghost"
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => void save()}
                disabled={saving || reason.trim().length < 3}
              >
                {saving ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                {saving ? "กำลังบันทึก" : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
