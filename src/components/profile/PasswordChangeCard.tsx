"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { ProfileSection } from "./ProfilePrimitives";
import { profileErrorText } from "./profileFeedback";
import { showActionSuccess } from "@/lib/sweet-alert";

function PasswordInput({
  id,
  label,
  name,
  autocomplete,
}: {
  id: string;
  label: string;
  name: string;
  autocomplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="account-profile-field">
      <label className="account-profile-field-label" htmlFor={id}>
        {label}
      </label>
      <div className="account-profile-password-wrap">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autocomplete}
          minLength={name === "currentPassword" ? undefined : 8}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={`${visible ? "ซ่อน" : "แสดง"}${label}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function PasswordChangeCard({ role }: { role: "teacher" | "student" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const prefix = `${role}-profile`;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const currentPassword = String(values.get("currentPassword") || "");
    const newPassword = String(values.get("newPassword") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) {
      setNotice({ tone: "error", text: "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน" });
      return;
    }
    if (newPassword.length < 8) {
      setNotice({
        tone: "error",
        text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร",
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/${role}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      formRef.current?.reset();
      setNotice({ tone: "success", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
      void showActionSuccess(
        result.message || "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
      );
    } catch (error) {
      setNotice({
        tone: "error",
        text: profileErrorText(error, "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่"),
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <ProfileSection
      title="เปลี่ยนรหัสผ่าน"
      description="ดูแลความปลอดภัยของบัญชีด้วยรหัสผ่านที่คาดเดาได้ยาก"
      icon={<KeyRound size={20} />}
    >
      <form className="account-profile-form" ref={formRef} onSubmit={submit}>
        <div className="account-profile-fields">
          <PasswordInput
            id={`${prefix}-current-password`}
            label="รหัสผ่านเดิม"
            name="currentPassword"
            autocomplete="current-password"
          />
          <PasswordInput
            id={`${prefix}-new-password`}
            label="รหัสผ่านใหม่"
            name="newPassword"
            autocomplete="new-password"
          />
          <PasswordInput
            id={`${prefix}-confirm-password`}
            label="ยืนยันรหัสผ่านใหม่"
            name="confirmPassword"
            autocomplete="new-password"
          />
        </div>
        <p className="account-profile-help">
          <LockKeyhole size={15} aria-hidden="true" />
          รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร
        </p>
        {notice && (
          <p
            className={`account-profile-notice ${notice.tone}`}
            role={notice.tone === "error" ? "alert" : "status"}
          >
            {notice.text}
          </p>
        )}
        <div className="account-profile-actions">
          <button
            className="account-profile-button primary"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <KeyRound size={17} />
            )}
            {busy ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่าน"}
          </button>
        </div>
      </form>
    </ProfileSection>
  );
}
