"use client";

import { useEffect } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  X,
  FileQuestion,
} from "lucide-react";

export type AttachmentInfo = {
  requestId: number;
  name: string;
  mime: string;
  size?: number;
  uploadDate?: string;
};

export default function AttachmentModal({
  attachment,
  onClose,
}: {
  attachment: AttachmentInfo | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (attachment) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [attachment, onClose]);

  if (!attachment) return null;

  const fileUrl = `/api/attachments/profile-request/${attachment.requestId}`;
  const downloadUrl = `${fileUrl}?download=1`;
  const isImage = attachment.mime.startsWith("image/");
  const isPdf = attachment.mime === "application/pdf";

  function formatFileSize(bytes?: number) {
    if (!bytes) return "ไม่ระบุขนาด";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div
      className="student-modal-layer attachment-modal-layer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-label="ดูไฟล์แนบเอกสารหลักฐาน"
    >
      <div className="student-modal card attachment-modal">
        <header className="attachment-modal-header">
          <div className="attachment-header-info">
            <div className="attachment-type-icon">
              {isImage ? (
                <ImageIcon size={22} />
              ) : isPdf ? (
                <FileText size={22} />
              ) : (
                <FileQuestion size={22} />
              )}
            </div>
            <div>
              <h3>{attachment.name || "เอกสารหลักฐาน"}</h3>
              <p>
                {attachment.mime} · {formatFileSize(attachment.size)}
                {attachment.uploadDate && ` · อัปโหลดเมื่อ ${attachment.uploadDate}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </header>

        <div className="attachment-modal-body">
          {isImage ? (
            <div className="attachment-preview-img-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={attachment.name || "เอกสารหลักฐาน"}
                className="attachment-img-preview"
              />
            </div>
          ) : isPdf ? (
            <div className="attachment-preview-pdf-box">
              <iframe
                src={fileUrl}
                title={attachment.name || "PDF Preview"}
                className="attachment-pdf-frame"
              />
            </div>
          ) : (
            <div className="attachment-unsupported-box">
              <FileQuestion size={48} />
              <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้โดยตรง</p>
              <small>กรุณากดปุ่มดาวน์โหลดเพื่อดูไฟล์ในเครื่องของคุณ</small>
            </div>
          )}
        </div>

        <footer className="attachment-modal-footer">
          <div className="attachment-footer-left">
            {isPdf && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="button secondary"
              >
                <ExternalLink size={16} /> เปิด PDF ในหน้าต่างใหม่
              </a>
            )}
            <a
              href={downloadUrl}
              download={attachment.name}
              className="button primary"
            >
              <Download size={16} /> ดาวน์โหลดไฟล์
            </a>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>
            ปิด
          </button>
        </footer>
      </div>
    </div>
  );
}
