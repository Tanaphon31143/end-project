"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  FilePenLine,
  KeyRound,
  Pencil,
  Save,
  Send,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";

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

const IMPORTANT_FIELDS_CONFIG = [
  { id: "FULL_NAME", label: "ชื่อ - นามสกุล" },
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
  const [mode, setMode] = useState<"profile" | "password" | "request" | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Request form state
  const [selectedField, setSelectedField] = useState<string>("FULL_NAME");

  function getOldValue(field: string): string {
    switch (field) {
      case "FULL_NAME":
        return student.name;
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

  // 1. Submit immediate fields (email, phone, birthday, address)
  async function submitImmediate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    const form = new FormData(event.currentTarget);
    const body =
      mode === "profile"
        ? {
            email: form.get("email"),
            phone: form.get("phone"),
            birthday: form.get("birthday"),
            address: form.get("address"),
          }
        : {
            currentPassword: form.get("currentPassword"),
            newPassword: form.get("newPassword"),
          };

    try {
      const response = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "บันทึกข้อมูลไม่สำเร็จ");
      }
      setMessage(data.message || "บันทึกข้อมูลเรียบร้อยแล้ว");
      router.refresh();
      setTimeout(() => setMode(null), 1000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  // 2. Submit correction request for critical fields (name, code, classroom, etc.)
  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    const form = new FormData(event.currentTarget);
    form.set("fieldType", selectedField);
    form.set("oldValue", getOldValue(selectedField));

    try {
      const response = await fetch("/api/student/profile-requests", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "ยื่นคำร้องไม่สำเร็จ");
      }
      setMessage(data.message || "ยื่นคำร้องเรียบร้อยแล้ว");
      router.refresh();
      if (onRequestSubmitted) onRequestSubmitted();
      setTimeout(() => setMode(null), 1200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function uploadProfileImage(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setErrorMessage("");

    const form = new FormData();
    form.set("image", file);

    try {
      const response = await fetch("/api/student/profile", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "อัปโหลดรูปไม่สำเร็จ");
      setMessage(data.message || "เปลี่ยนรูปประจำตัวสำเร็จ");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="profile-action-buttons">
        <label
          className={`button secondary profile-upload ${busy ? "disabled" : ""}`}
        >
          <Camera size={17} /> เปลี่ยนรูป
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              void uploadProfileImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setMode("profile");
            setMessage("");
            setErrorMessage("");
          }}
        >
          <Pencil size={17} /> แก้ไขข้อมูลติดต่อ
        </button>

        <button
          type="button"
          className="button primary"
          onClick={() => {
            setMode("request");
            setSelectedField("FULL_NAME");
            setMessage("");
            setErrorMessage("");
          }}
        >
          <FilePenLine size={17} /> ยื่นคำร้องแก้ไขข้อมูล
        </button>

        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setMode("password");
            setMessage("");
            setErrorMessage("");
          }}
        >
          <KeyRound size={17} /> เปลี่ยนรหัสผ่าน
        </button>
      </div>

      {message && !mode && <p className="success-banner">{message}</p>}
      {errorMessage && !mode && <p className="error-banner">{errorMessage}</p>}

      {/* Modal for Immediate Profile Edit (Email, Phone, Birthday, Address) */}
      {mode === "profile" && (
        <div
          className="student-modal-layer"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setMode(null);
          }}
        >
          <form className="student-modal card" onSubmit={submitImmediate}>
            <header>
              <div>
                <h2>แก้ไขข้อมูลติดต่อส่วนตัว</h2>
                <p>ข้อมูลติดต่อสามารถปรับปรุงได้ทันทีโดยไม่ต้องรออนุมัติ</p>
              </div>
              <button type="button" onClick={() => setMode(null)}>
                <X size={19} />
              </button>
            </header>

            <div className="field">
              <label>อีเมล</label>
              <input
                className="input"
                name="email"
                type="email"
                defaultValue={student.email}
                required
              />
            </div>
            <div className="field">
              <label>เบอร์โทรศัพท์</label>
              <input
                className="input"
                name="phone"
                defaultValue={student.phone}
                maxLength={30}
              />
            </div>
            <div className="field">
              <label>วันเกิด</label>
              <input
                className="input"
                name="birthday"
                type="date"
                defaultValue={student.birthday}
              />
            </div>
            <div className="field">
              <label>ที่อยู่</label>
              <textarea
                className="textarea"
                name="address"
                defaultValue={student.address}
                maxLength={1000}
                rows={3}
              />
            </div>

            {message && <p className="modal-message success">{message}</p>}
            {errorMessage && <p className="modal-message error">{errorMessage}</p>}

            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setMode(null)}
              >
                ยกเลิก
              </button>
              <button className="button primary" disabled={busy}>
                <Save size={17} /> {busy ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Modal for Critical Profile Edit Requests (Name, Student Code, Grade, Room, Class Number) */}
      {mode === "request" && (
        <div
          className="student-modal-layer"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setMode(null);
          }}
        >
          <form className="student-modal card request-form-modal" onSubmit={submitRequest}>
            <header>
              <div>
                <h2>ยื่นคำร้องขอแก้ไขข้อมูลสำคัญ</h2>
                <p>ข้อมูลสำคัญต้องผ่านการพิจารณาและอนุมัติจากผู้ดูแลระบบ</p>
              </div>
              <button type="button" onClick={() => setMode(null)}>
                <X size={19} />
              </button>
            </header>

            <div className="field">
              <label>ประเภทข้อมูลที่ต้องการแก้ไข</label>
              <select
                className="input"
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
              >
                {IMPORTANT_FIELDS_CONFIG.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>ข้อมูลปัจจุบัน (ค่าเดิม)</label>
              <input
                className="input readonly"
                value={getOldValue(selectedField) || "ยังไม่มีข้อมูล"}
                readOnly
              />
            </div>

            <div className="field">
              <label>ข้อมูลที่ถูกต้อง (ค่าใหม่) *</label>
              <input
                className="input"
                name="newValue"
                placeholder="ระบุข้อมูลที่ถูกต้อง..."
                required
              />
            </div>

            <div className="field">
              <label>เหตุผลในการขอแก้ไข *</label>
              <textarea
                className="textarea"
                name="reason"
                placeholder="อธิบายเหตุผล เช่น สะกดชื่อผิด, ย้ายห้องเรียน..."
                minLength={5}
                maxLength={1000}
                required
                rows={3}
              />
            </div>

            <div className="field">
              <label>เอกสารหรือภาพถ่ายหลักฐาน (JPG, PNG หรือ PDF ไม่เกิน 5MB)</label>
              <input
                type="file"
                name="attachment"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="input file-input"
              />
              <small className="field-hint">
                แนบรูปบัตรประชาชน, บัตรนักเรียน, หรือเอกสารทางราชการเพื่อประกอบการพิจารณา
              </small>
            </div>

            {message && <p className="modal-message success">{message}</p>}
            {errorMessage && <p className="modal-message error">{errorMessage}</p>}

            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setMode(null)}
              >
                ยกเลิก
              </button>
              <button className="button primary" disabled={busy}>
                <Send size={17} /> {busy ? "กำลังส่งคำร้อง..." : "ส่งคำร้องแก้ไข"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Modal for Password Change */}
      {mode === "password" && (
        <div
          className="student-modal-layer"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setMode(null);
          }}
        >
          <form className="student-modal card" onSubmit={submitImmediate}>
            <header>
              <div>
                <h2>เปลี่ยนรหัสผ่าน</h2>
                <p>กำหนดรหัสผ่านใหม่เพื่อความปลอดภัยในการเข้าใช้งาน</p>
              </div>
              <button type="button" onClick={() => setMode(null)}>
                <X size={19} />
              </button>
            </header>

            <div className="field">
              <label>รหัสผ่านปัจจุบัน</label>
              <input
                className="input"
                name="currentPassword"
                type="password"
                required
              />
            </div>
            <div className="field">
              <label>รหัสผ่านใหม่</label>
              <input
                className="input"
                name="newPassword"
                type="password"
                minLength={8}
                required
              />
              <small className="field-hint">ความยาวอย่างน้อย 8 ตัวอักษร</small>
            </div>

            {message && <p className="modal-message success">{message}</p>}
            {errorMessage && <p className="modal-message error">{errorMessage}</p>}

            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setMode(null)}
              >
                ยกเลิก
              </button>
              <button className="button primary" disabled={busy}>
                <Save size={17} /> {busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
