"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, ChevronDown, CheckCircle2 } from "lucide-react";
import type { RequestStatus, SubjectRequest } from "@/lib/subject-requests";
import { SubjectRequestCard } from "./SubjectRequestCard";

const labels: Record<RequestStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CHANGES_REQUESTED: "ขอแก้ไขข้อมูล",
};

export function SubjectRequestsQueue({
  initialRequests,
  onRequestsChange,
  onApproved,
}: {
  initialRequests: SubjectRequest[];
  onRequestsChange?: (requests: SubjectRequest[]) => void;
  onApproved?: () => void;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function review(
    id: number,
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES",
  ) {
    const remark = (remarks[id] || "").trim();
    if (action !== "APPROVE" && !remark) {
      setError("กรุณาระบุเหตุผลหรือข้อมูลที่ต้องแก้ไขก่อนดำเนินการ");
      return;
    }
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/subject-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, action, remark }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "บันทึกผลไม่สำเร็จ");
      const refreshed = await fetch("/api/admin/subject-requests", {
        cache: "no-store",
      });
      if (!refreshed.ok)
        throw new Error(
          "บันทึกแล้ว แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณารีเฟรชหน้า",
        );
      const nextRequests = (
        (await refreshed.json()) as { requests: SubjectRequest[] }
      ).requests;
      setRequests(nextRequests);
      onRequestsChange?.(nextRequests);
      setNotice(result.message || "บันทึกผลแล้ว");
      if (action === "APPROVE") onApproved?.();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setBusy(null);
    }
  }

  const pending = requests.filter((item) => item.status === "PENDING");
  const processed = requests.filter((item) => item.status !== "PENDING");

  // If no pending requests, show a neat, non-intrusive collapsible drawer
  if (pending.length === 0) {
    if (processed.length === 0) return null;
    return (
      <details className="admin-subject-requests-minimal">
        <summary>
          <div className="requests-minimal-summary">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>ไม่มีคำขอที่รออนุมัติ</span>
            <span className="requests-minimal-count">
              (ประวัติคำขอที่พิจารณาแล้ว {processed.length} รายการ)
            </span>
          </div>
          <ChevronDown size={15} className="requests-minimal-chevron" />
        </summary>
        <div className="requests-minimal-body">
          {processed.map((item) => (
            <div className="admin-subject-request-past-row" key={item.id}>
              <span>
                <strong>{item.subjectName}</strong> ({item.subjectCode}) · {item.teacherName} · {item.classroomName}
              </span>
              <span className={`request-status-tag ${item.status.toLowerCase()}`}>
                {labels[item.status]}
              </span>
            </div>
          ))}
        </div>
      </details>
    );
  }

  return (
    <section className="admin-subject-requests">
      <div className="admin-subject-requests-head">
        <div className="admin-subject-requests-heading">
          <Clock3 size={20} aria-hidden="true" />
          <div>
            <h2>คำขอเปิดรายวิชาจากครู</h2>
            <p>ตรวจสอบข้อมูลและพิจารณาอนุมัติการเปิดรายวิชาที่ครูส่งเข้ามา</p>
          </div>
        </div>
        <span className="admin-subject-request-count">
          <strong>{pending.length}</strong>
          <span>คำขอรอตรวจสอบ</span>
        </span>
      </div>
      {error && (
        <p className="admin-subject-request-alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-subject-request-alert success" role="status">
          {notice}
        </p>
      )}
      <div className="admin-subject-request-list">
        {pending.map((item) => (
          <SubjectRequestCard
            key={item.id}
            request={item}
            remark={remarks[item.id] || ""}
            busy={busy === item.id}
            disabled={busy !== null}
            onRemarkChange={(value) =>
              setRemarks((current) => ({ ...current, [item.id]: value }))
            }
            onReview={(action) => review(item.id, action)}
          />
        ))}
      </div>
      {processed.length > 0 && (
        <details className="admin-subject-request-past">
          <summary>คำขอที่พิจารณาแล้ว ({processed.length})</summary>
          <div>
            {processed.map((item) => (
              <div className="admin-subject-request-past-row" key={item.id}>
                <span>
                  <strong>{item.subjectName}</strong> · {item.teacherName} · {item.classroomName}
                </span>
                <span className={`request-status-tag ${item.status.toLowerCase()}`}>
                  {labels[item.status]}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
