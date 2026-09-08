"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, LockKeyhole, Save } from "lucide-react";
import type { TeacherIdentity } from "@/lib/teacher-data";

type Notice = { tone: "success" | "error"; text: string } | null;

async function updateProfile(payload: Record<string, string>) {
  const response = await fetch("/api/teacher/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "บันทึกข้อมูลไม่สำเร็จ");
}

export function ProfileClient({
  initialTeacher,
}: {
  initialTeacher: TeacherIdentity;
}) {
  const router = useRouter();
  const [savingContact, setSavingContact] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [contactNotice, setContactNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadProfile(file?: File) {
    if (!file) return;
    setUploading(true);
    setContactNotice(null);
    const form = new FormData();
    form.set("image", file);
    try {
      const response = await fetch("/api/teacher/profile", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "เปลี่ยนรูปไม่สำเร็จ");
      setContactNotice({ tone: "success", text: data.message });
      router.refresh();
    } catch (error) {
      setContactNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "เปลี่ยนรูปไม่สำเร็จ",
      });
    } finally {
      setUploading(false);
    }
  }

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingContact(true);
    setContactNotice(null);
    const values = new FormData(event.currentTarget);
    try {
      await updateProfile({
        email: String(values.get("email") ?? ""),
        phone: String(values.get("phone") ?? ""),
      });
      setContactNotice({
        tone: "success",
        text: "บันทึกข้อมูลติดต่อเรียบร้อยแล้ว",
      });
    } catch (error) {
      setContactNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ",
      });
    } finally {
      setSavingContact(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordNotice(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await updateProfile({
        currentPassword: String(values.get("currentPassword") ?? ""),
        newPassword: String(values.get("newPassword") ?? ""),
        confirmPassword: String(values.get("confirmPassword") ?? ""),
      });
      form.reset();
      setPasswordNotice({
        tone: "success",
        text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว",
      });
    } catch (error) {
      setPasswordNotice({
        tone: "error",
        text:
          error instanceof Error ? error.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>โปรไฟล์ของฉัน</h2>
          <p>จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชี</p>
        </div>
      </div>
      <div className="profile-grid">
        <aside className="panel profile-card">
          <div className="profile-photo">
            {initialTeacher.hasProfileImage ? (
              <Image
                src="/api/teacher/profile-image"
                alt="รูปโปรไฟล์ครู"
                width={112}
                height={112}
                unoptimized
              />
            ) : (
              initialTeacher.initials
            )}
          </div>
          <h3>{initialTeacher.name}</h3>
          <p>{initialTeacher.position}</p>
          <p>รหัสครู {initialTeacher.code}</p>
          <label
            className={`button secondary profile-upload ${uploading ? "disabled" : ""}`}
          >
            <Camera size={16} />
            {uploading ? "กำลังอัปโหลด" : "เปลี่ยนรูปโปรไฟล์"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(event) => {
                void uploadProfile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </aside>
        <div className="stack">
          <form className="panel" onSubmit={saveContact}>
            <div className="panel-head">
              <div>
                <h3>ข้อมูลส่วนตัว</h3>
                <span className="muted">
                  ชื่อและรหัสครูแก้ไขได้โดยผู้ดูแลระบบเท่านั้น
                </span>
              </div>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>ชื่อ–นามสกุล</label>
                <input value={initialTeacher.name} disabled />
              </div>
              <div className="field">
                <label htmlFor="teacher-email">อีเมล</label>
                <input
                  id="teacher-email"
                  name="email"
                  type="email"
                  defaultValue={initialTeacher.email}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="teacher-phone">เบอร์โทร</label>
                <input
                  id="teacher-phone"
                  name="phone"
                  defaultValue={initialTeacher.phone}
                />
              </div>
            </div>
            {contactNotice && (
              <p className={`form-message ${contactNotice.tone}`}>
                {contactNotice.text}
              </p>
            )}
            <div className="form-actions">
              <button className="button primary" disabled={savingContact}>
                {savingContact ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                {savingContact ? "กำลังบันทึก" : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </form>
          <form className="panel" onSubmit={savePassword}>
            <div className="panel-head">
              <h3>เปลี่ยนรหัสผ่าน</h3>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="current-password">รหัสผ่านเดิม</label>
                <input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">รหัสผ่านใหม่</label>
                <input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            {passwordNotice && (
              <p className={`form-message ${passwordNotice.tone}`}>
                {passwordNotice.text}
              </p>
            )}
            <div className="form-actions">
              <button className="button primary" disabled={savingPassword}>
                {savingPassword ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <LockKeyhole size={16} />
                )}
                {savingPassword ? "กำลังเปลี่ยน" : "เปลี่ยนรหัสผ่าน"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
