"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Paperclip,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import AttachmentModal, { type AttachmentInfo } from "./AttachmentModal";

type ProfileRequestItem = {
  id: number;
  fieldType: string;
  oldValue: string;
  newValue: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  rejectionReason: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  hasAttachment: boolean;
  createdAt: string;
  reviewedAt: string | null;
};

function getFieldLabel(field: string): string {
  switch (field) {
    case "FULL_NAME":
      return "ชื่อ-นามสกุล";
    case "STUDENT_CODE":
      return "รหัสนักเรียน";
    case "GRADE_LEVEL":
      return "ระดับชั้น";
    case "CLASSROOM":
      return "ห้องเรียน";
    case "CLASS_NUMBER":
      return "เลขที่";
    default:
      return field;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <span className="badge warning">รอตรวจสอบ</span>;
    case "APPROVED":
      return <span className="badge success">อนุมัติแล้ว</span>;
    case "REJECTED":
      return <span className="badge danger">ปฏิเสธ</span>;
    case "CANCELLED":
      return <span className="badge">ยกเลิก</span>;
    default:
      return <span className="badge">{status}</span>;
  }
}

export default function ProfileRequestHistory() {
  const [requests, setRequests] = useState<ProfileRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAttachment, setActiveAttachment] = useState<AttachmentInfo | null>(null);

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch("/api/student/profile-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <>
      <section className="card card-pad profile-request-history">
        <div className="section-head">
          <div>
            <h2>ประวัติคำร้องแก้ไขข้อมูลส่วนตัว</h2>
            <p>ติดตามสถานะคำร้องขอแก้ไขข้อมูลสำคัญที่ยื่นต่อฝ่ายทะเบียนและผู้ดูแลระบบ</p>
          </div>
          <button
            type="button"
            className="button secondary refresh-btn"
            onClick={loadRequests}
            title="รีเฟรชประวัติคำร้อง"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} /> รีเฟรช
          </button>
        </div>

        {loading ? (
          <div className="table-loading">
            <div className="skeleton-item" />
            <div className="skeleton-item" />
          </div>
        ) : requests.length === 0 ? (
          <div className="table-empty">
            <FileSpreadsheet size={40} />
            <p>ยังไม่มีประวัติการยื่นคำร้องแก้ไขข้อมูล</p>
            <small>
              หากชื่อ-สกุล รหัสนักเรียน หรือห้องเรียนไม่ถูกต้อง สามารถกดยื่นคำร้องได้ที่ปุ่มด้านบน
            </small>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>วันที่ยื่น</th>
                  <th>ประเภทข้อมูล</th>
                  <th>การเปลี่ยนแปลง</th>
                  <th>เหตุผล</th>
                  <th>สถานะ</th>
                  <th>ไฟล์แนบ</th>
                  <th>ผลการพิจารณา</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.createdAt}</td>
                    <td>
                      <strong>{getFieldLabel(r.fieldType)}</strong>
                    </td>
                    <td>
                      <span className="diff-change">
                        <del>{r.oldValue || "-"}</del> → <ins>{r.newValue}</ins>
                      </span>
                    </td>
                    <td className="reason-cell">{r.reason}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      {r.hasAttachment ? (
                        <button
                          type="button"
                          className="button secondary view-attachment-btn"
                          onClick={() =>
                            setActiveAttachment({
                              requestId: r.id,
                              name: r.attachmentName || "เอกสารหลักฐาน",
                              mime: r.attachmentMime || "application/octet-stream",
                              size: r.attachmentSize || undefined,
                              uploadDate: r.createdAt,
                            })
                          }
                        >
                          <Paperclip size={14} /> ดูไฟล์แนบ
                        </button>
                      ) : (
                        <span className="empty-attachment">ไม่มีไฟล์แนบ</span>
                      )}
                    </td>
                    <td>
                      {r.status === "APPROVED" && (
                        <span className="approved-note">
                          อนุมัติเมื่อ {r.reviewedAt || "-"}
                        </span>
                      )}
                      {r.status === "REJECTED" && (
                        <span className="rejection-note">
                          {r.rejectionReason || "ไม่ผ่านเกณฑ์การพิจารณา"}
                        </span>
                      )}
                      {r.status === "PENDING" && (
                        <span className="pending-note">อยู่ระหว่างตรวจสอบ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Secure Attachment Viewer Modal */}
      <AttachmentModal
        attachment={activeAttachment}
        onClose={() => setActiveAttachment(null)}
      />
    </>
  );
}
