"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Save, UserRound, X } from "lucide-react";
import type { TeacherIdentity } from "@/lib/teacher-data";
import {
  ProfileAccountCard,
  ProfilePageHeading,
  ProfileReadOnlyField,
  ProfileSection,
} from "@/components/profile/ProfilePrimitives";
import { ProfileSummaryCard } from "@/components/profile/ProfileSummaryCard";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { profileErrorText } from "@/components/profile/profileFeedback";
import { showActionSuccess } from "@/lib/sweet-alert";

export function ProfileClient({
  initialTeacher,
}: {
  initialTeacher: TeacherIdentity;
}) {
  const router = useRouter();
  const department =
    initialTeacher.position === "ครูผู้สอน"
      ? "ไม่พบข้อมูล"
      : initialTeacher.position;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState({
    name: initialTeacher.name,
    email: initialTeacher.email,
    phone: initialTeacher.phone,
  });
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const profileInitials =
    saved.name
      .replace(/^(นาย|นางสาว|นาง)/, "")
      .trim()
      .slice(0, 2) || "ครู";

  function cancel() {
    setDraft(saved);
    setEditing(false);
    setNotice(null);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const normalizedDraft = {
        ...draft,
        name: draft.name.trim().replace(/\s+/g, " "),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
      };
      const response = await fetch("/api/teacher/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedDraft),
      });
      const result = (await response.json()) as {
        message?: string;
        profile?: typeof normalizedDraft;
      };
      if (!response.ok)
        throw new Error(result.message || "บันทึกข้อมูลไม่สำเร็จ");
      const nextProfile = result.profile ?? normalizedDraft;
      setSaved(nextProfile);
      setDraft(nextProfile);
      setEditing(false);
      setNotice({ tone: "success", text: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว" });
      void showActionSuccess(
        result.message || "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว",
      );
      router.refresh();
    } catch (error) {
      setNotice({
        tone: "error",
        text: profileErrorText(error, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-profile teacher-account-profile">
      <ProfilePageHeading />
      <div className="account-profile-layout">
        <ProfileSummaryCard
          name={saved.name}
          role="ครูผู้สอน"
          code={initialTeacher.code}
          context={department}
          initials={profileInitials}
          hasProfileImage={initialTeacher.hasProfileImage}
          imageUrl="/api/teacher/profile-image"
          uploadUrl="/api/teacher/profile"
        />
        <div className="account-profile-main">
          <ProfileSection
            title="ข้อมูลส่วนตัว"
            description="ข้อมูลประจำตัวและช่องทางติดต่อ"
            icon={<UserRound size={20} />}
          >
            <form className="account-profile-form" onSubmit={save}>
              <div className="account-profile-fields">
                <div className="account-profile-field">
                  <label
                    className="account-profile-field-label"
                    htmlFor="teacher-profile-name"
                  >
                    ชื่อ-นามสกุล
                  </label>
                  {editing ? (
                    <input
                      id="teacher-profile-name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={150}
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
                    />
                  ) : (
                    <div className="account-profile-readonly">
                      <span>{saved.name || "ไม่พบข้อมูล"}</span>
                    </div>
                  )}
                </div>
                <ProfileReadOnlyField
                  label="รหัสครู"
                  value={initialTeacher.code}
                />
                <div className="account-profile-field">
                  <label
                    className="account-profile-field-label"
                    htmlFor="teacher-profile-email"
                  >
                    อีเมล
                  </label>
                  {editing ? (
                    <input
                      id="teacher-profile-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={draft.email}
                      onChange={(event) =>
                        setDraft({ ...draft, email: event.target.value })
                      }
                    />
                  ) : (
                    <div className="account-profile-readonly">
                      <span>{saved.email || "ไม่พบข้อมูล"}</span>
                    </div>
                  )}
                </div>
                <div className="account-profile-field">
                  <label
                    className="account-profile-field-label"
                    htmlFor="teacher-profile-phone"
                  >
                    เบอร์โทรศัพท์
                  </label>
                  {editing ? (
                    <input
                      id="teacher-profile-phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={30}
                      value={draft.phone}
                      onChange={(event) =>
                        setDraft({ ...draft, phone: event.target.value })
                      }
                    />
                  ) : (
                    <div className="account-profile-readonly">
                      <span>{saved.phone || "ไม่พบข้อมูล"}</span>
                    </div>
                  )}
                </div>
                <ProfileReadOnlyField
                  label="กลุ่มสาระ / แผนก"
                  value={department}
                />
                <ProfileReadOnlyField label="สถานะบัญชี" value="ใช้งานอยู่" />
              </div>
              <p className="account-profile-help">
                รหัสครู กลุ่มสาระ และสถานะบัญชีสามารถแก้ไขได้โดยผู้ดูแลระบบเท่านั้น
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
                {editing ? (
                  <>
                    <button
                      className="account-profile-button secondary"
                      type="button"
                      onClick={cancel}
                      disabled={busy}
                    >
                      <X size={17} />
                      ยกเลิก
                    </button>
                    <button
                      className="account-profile-button primary"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : (
                        <Save size={17} />
                      )}
                      {busy ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}
                    </button>
                  </>
                ) : (
                  <button
                    className="account-profile-button secondary"
                    type="button"
                    onClick={() => {
                      setDraft(saved);
                      setEditing(true);
                      setNotice(null);
                    }}
                  >
                    <Pencil size={17} />
                    แก้ไขข้อมูล
                  </button>
                )}
              </div>
            </form>
          </ProfileSection>
          <PasswordChangeCard role="teacher" />
        </div>
      </div>
      <ProfileAccountCard
        role="ครูผู้สอน"
        code={initialTeacher.code}
        context={department}
      />
    </div>
  );
}
