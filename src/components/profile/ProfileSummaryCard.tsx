"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, Camera, ImageUp, School } from "lucide-react";
import { profileErrorText } from "./profileFeedback";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

export function ProfileSummaryCard({
  name,
  role,
  code,
  context,
  initials,
  hasProfileImage,
  imageUrl,
  uploadUrl,
}: {
  name: string;
  role: "ครูผู้สอน" | "นักเรียน";
  code: string;
  context: string;
  initials: string;
  hasProfileImage: boolean;
  imageUrl: string;
  uploadUrl: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function upload(file?: File) {
    if (!file) return;
    setNotice(null);
    if (!allowed.has(file.type) || file.size > maxBytes || file.size === 0) {
      setNotice({
        tone: "error",
        text: "รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB",
      });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setBusy(true);
    try {
      const data = new FormData();
      data.set("image", file);
      const response = await fetch(uploadUrl, { method: "POST", body: data });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "เปลี่ยนรูปโปรไฟล์ไม่สำเร็จ");
      setNotice({
        tone: "success",
        text: result.message || "เปลี่ยนรูปโปรไฟล์แล้ว",
      });
      router.refresh();
    } catch (error) {
      setPreview(null);
      setNotice({
        tone: "error",
        text: profileErrorText(
          error,
          "เปลี่ยนรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่",
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="account-profile-summary">
      <div className="account-profile-avatar-wrap">
        <div className="account-profile-avatar">
          {preview || hasProfileImage ? (
            <Image
              src={preview || imageUrl}
              alt={`รูปโปรไฟล์${role}`}
              width={116}
              height={116}
              sizes="116px"
              unoptimized
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <label className="account-profile-camera" title="เปลี่ยนรูปโปรไฟล์">
          <Camera size={17} aria-hidden="true" />
          <span className="sr-only">เลือกรูปโปรไฟล์</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <h2>{name}</h2>
      <p className="account-profile-role">{role}</p>
      <span className="account-profile-id">
        <BadgeCheck size={15} aria-hidden="true" />
        {role === "ครูผู้สอน" ? "รหัสครู" : "รหัสนักเรียน"} {code}
      </span>
      <div className="account-profile-summary-meta">
        <span>{context}</span>
        <span>
          <School size={15} aria-hidden="true" /> โรงเรียนขุขันธ์
        </span>
      </div>
      <label
        className={`account-profile-upload-button ${busy ? "is-busy" : ""}`}
      >
        <ImageUp size={17} aria-hidden="true" />
        {busy ? "กำลังอัปโหลด…" : "เปลี่ยนรูปโปรไฟล์"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      <p className="account-profile-upload-hint">
        JPG, PNG หรือ WebP · ไม่เกิน 5 MB
      </p>
      {notice && (
        <p
          className={`account-profile-notice ${notice.tone}`}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      )}
      <div className="account-profile-summary-footer">
        <span>สถานะบัญชี</span>
        <strong>
          <span aria-hidden="true" />
          ใช้งานอยู่
        </strong>
      </div>
    </aside>
  );
}
