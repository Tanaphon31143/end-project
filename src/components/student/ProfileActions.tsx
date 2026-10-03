"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, LoaderCircle, Pencil, Save, Send, X } from "lucide-react";
import { ProfileReadOnlyField } from "@/components/profile/ProfilePrimitives";
import { profileErrorText } from "@/components/profile/profileFeedback";
import { showActionSuccess } from "@/lib/sweet-alert";
import StudentModal from "./StudentModal";

export type StudentProfileValues = {
  name: string;
  code: string;
  className: string;
  classLevel: string;
  classNumber: number | null;
  email: string;
  phone: string;
  birthday: string;
  address: string;
};

const importantFields = [
  { id: "STUDENT_CODE", label: "รหัสนักเรียน" },
  { id: "GRADE_LEVEL", label: "ระดับชั้น" },
  { id: "CLASSROOM", label: "ห้องเรียน" },
  { id: "CLASS_NUMBER", label: "เลขที่" },
] as const;

export default function ProfileActions({
  student,
  onRequestSubmitted,
}: {
  student: StudentProfileValues;
  onRequestSubmitted?: () => void;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState({
    name: student.name,
    email: student.email,
    phone: student.phone,
    birthday: student.birthday,
    address: student.address,
  });
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<string>("STUDENT_CODE");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  function oldValue(field: string) {
    switch (field) {
      case "FULL_NAME":
        return saved.name;
      case "STUDENT_CODE":
        return student.code;
      case "GRADE_LEVEL":
        return student.classLevel || "";
      case "CLASSROOM":
        return student.className;
      case "CLASS_NUMBER":
        return student.classNumber ? String(student.classNumber) : "";
      default:
        return "";
    }
  }

  function cancel() {
    setDraft(saved);
    setEditing(false);
    setNotice(null);
  }

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const normalizedDraft = {
        ...draft,
        name: draft.name.trim().replace(/\s+/g, " "),
      };
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedDraft),
      });
      const result = (await response.json()) as { message?: string; name?: string };
      if (!response.ok)
        throw new Error(result.message || "บันทึกข้อมูลไม่สำเร็จ");
      const nextSaved = { ...normalizedDraft, name: result.name ?? normalizedDraft.name };
      setSaved(nextSaved);
      setDraft(nextSaved);
      setEditing(false);
      const text = result.message || "บันทึกข้อมูลส่วนตัวแล้ว";
      setNotice({ tone: "success", text });
      void showActionSuccess(text);
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

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    form.set("fieldType", selectedField);
    form.set("oldValue", oldValue(selectedField));
    try {
      const response = await fetch("/api/student/profile-requests", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "ยื่นคำร้องไม่สำเร็จ");
      const text = result.message || "ยื่นคำร้องเรียบร้อยแล้ว";
      setNotice({ tone: "success", text });
      setRequestOpen(false);
      void showActionSuccess(text);
      router.refresh();
      onRequestSubmitted?.();
      window.dispatchEvent(new Event("student-profile-request-submitted"));
    } catch (error) {
      setNotice({
        tone: "error",
        text: profileErrorText(error, "ยื่นคำร้องไม่สำเร็จ กรุณาลองใหม่"),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="account-profile-form" onSubmit={saveContact}>
        <div className="account-profile-fields">
          <div className="account-profile-field">
            <label className="account-profile-field-label" htmlFor="student-profile-name">
              ชื่อ-นามสกุล
            </label>
            {editing ? (
              <input
                id="student-profile-name"
                type="text"
                autoComplete="name"
                required
                maxLength={150}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            ) : (
              <div className="account-profile-readonly">
                <span>{saved.name || "ไม่พบข้อมูล"}</span>
              </div>
            )}
          </div>
          <ProfileReadOnlyField label="รหัสนักเรียน" value={student.code} />
          {(
            [
              ["อีเมล", "email", "email", "email"],
              ["เบอร์โทรศัพท์", "phone", "tel", "tel"],
              ["วันเกิด", "birthday", "date", "bday"],
              ["ที่อยู่", "address", "text", "street-address"],
            ] as const
          ).map(([label, key, type, autocomplete]) => (
            <div
              className={`account-profile-field ${key === "address" ? "wide" : ""}`}
              key={key}
            >
              <label
                className="account-profile-field-label"
                htmlFor={`student-profile-${key}`}
              >
                {label}
              </label>
              {editing ? (
                key === "address" ? (
                  <textarea
                    id={`student-profile-${key}`}
                    rows={3}
                    maxLength={1000}
                    autoComplete={autocomplete}
                    value={draft.address}
                    onChange={(event) =>
                      setDraft({ ...draft, address: event.target.value })
                    }
                  />
                ) : (
                  <input
                    id={`student-profile-${key}`}
                    type={type}
                    autoComplete={autocomplete}
                    value={draft[key]}
                    maxLength={key === "phone" ? 30 : undefined}
                    required={key === "email"}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                )
              ) : (
                <div className="account-profile-readonly">
                  <span>{saved[key] || "ไม่พบข้อมูล"}</span>
                </div>
              )}
            </div>
          ))}
          <ProfileReadOnlyField label="ระดับชั้น" value={student.classLevel} />
          <ProfileReadOnlyField label="ห้องเรียน" value={student.className} />
          <ProfileReadOnlyField label="เลขที่" value={student.classNumber} />
          <ProfileReadOnlyField label="สถานะบัญชี" value="ใช้งานอยู่" />
        </div>
        <p className="account-profile-help">
          รหัสนักเรียนและข้อมูลห้องเรียนต้องยื่นคำร้องเพื่อให้ผู้ดูแลระบบแก้ไข
        </p>
        {notice && !requestOpen && (
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
                disabled={busy}
                onClick={cancel}
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
            <>
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
              <button
                className="account-profile-button outline"
                type="button"
                onClick={() => {
                  setRequestOpen(true);
                  setNotice(null);
                }}
              >
                <FilePenLine size={17} />
                ยื่นคำร้องแก้ไขข้อมูล
              </button>
            </>
          )}
        </div>
      </form>
      {requestOpen && (
        <StudentModal
          label="ยื่นคำร้องแก้ไขข้อมูล"
          busy={busy}
          onClose={() => setRequestOpen(false)}
        >
          <form
            className="student-modal card request-form-modal"
            onSubmit={submitRequest}
          >
            <header>
              <div>
                <h2>ยื่นคำร้องขอแก้ไขข้อมูลสำคัญ</h2>
                <p>ข้อมูลสำคัญต้องผ่านการพิจารณาจากผู้ดูแลระบบ</p>
              </div>
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                disabled={busy}
                onClick={() => setRequestOpen(false)}
              >
                <X size={19} />
              </button>
            </header>
            <div className="field">
              <label htmlFor="profile-field-type">
                ประเภทข้อมูลที่ต้องการแก้ไข
              </label>
              <select
                id="profile-field-type"
                className="input"
                value={selectedField}
                onChange={(event) => setSelectedField(event.target.value)}
              >
                {importantFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="profile-old-value">ข้อมูลปัจจุบัน</label>
              <input
                id="profile-old-value"
                className="input readonly"
                value={oldValue(selectedField) || "ยังไม่มีข้อมูล"}
                readOnly
              />
            </div>
            <div className="field">
              <label htmlFor="profile-new-value">ข้อมูลที่ถูกต้อง *</label>
              <input
                id="profile-new-value"
                className="input"
                name="newValue"
                required
                placeholder="ระบุข้อมูลที่ถูกต้อง"
              />
            </div>
            <div className="field">
              <label htmlFor="profile-reason">เหตุผลในการขอแก้ไข *</label>
              <textarea
                id="profile-reason"
                className="textarea"
                name="reason"
                minLength={5}
                maxLength={1000}
                rows={3}
                required
                placeholder="อธิบายเหตุผลในการแก้ไข"
              />
            </div>
            <div className="field">
              <label htmlFor="profile-attachment">
                เอกสารหรือภาพถ่ายหลักฐาน (JPG, PNG หรือ PDF ไม่เกิน 5 MB)
              </label>
              <input
                id="profile-attachment"
                className="input file-input"
                type="file"
                name="attachment"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
              <small className="field-hint">แนบเอกสารหลักฐานหากมี</small>
            </div>
            {notice && (
              <p
                className={`account-profile-notice ${notice.tone}`}
                role={notice.tone === "error" ? "alert" : "status"}
              >
                {notice.text}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setRequestOpen(false)}
              >
                ยกเลิก
              </button>
              <button className="button primary" type="submit" disabled={busy}>
                <Send size={17} />
                {busy ? "กำลังส่งคำร้อง…" : "ส่งคำร้องแก้ไข"}
              </button>
            </footer>
          </form>
        </StudentModal>
      )}
    </>
  );
}
