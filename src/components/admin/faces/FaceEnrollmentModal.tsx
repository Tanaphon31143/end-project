"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import Image from "next/image";
import {
  analyzeImageFile,
  analyzeVideoFrame,
  getFaceEngine,
} from "@/lib/face-recognition";
import type { FaceSample, FaceStudentOption } from "./types";

export default function FaceEnrollmentModal({
  students,
  initialStudentId,
  onClose,
  onSaved,
}: {
  students: FaceStudentOption[];
  initialStudentId: number | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null);
  const [studentId, setStudentId] = useState<number | null>(initialStudentId),
    [samples, setSamples] = useState<FaceSample[]>([]),
    [camera, setCamera] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("กำลังเตรียมโมเดลตรวจจับใบหน้า...");
  const existing =
    students.find((student) => student.id === studentId)?.faceStatus != null;
  useEffect(() => {
    void getFaceEngine()
      .then(() => setMessage("ถ่ายหรืออัปโหลดภาพหน้าตรงและหันเล็กน้อย 3–5 ภาพ"))
      .catch(() => setMessage("โหลดโมเดลไม่สำเร็จ กรุณารีเฟรชหน้า"));
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  async function startCamera() {
    setMessage("");
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera(true);
    } catch {
      setMessage("เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้อง");
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
  }
  async function capture() {
    if (!videoRef.current || samples.length >= 5) return;
    setBusy(true);
    setMessage("กำลังตรวจสอบและสร้าง Face Embedding...");
    try {
      const sample = await analyzeVideoFrame(videoRef.current);
      setSamples((current) => [...current, sample]);
      setMessage("บันทึกภาพตัวอย่างแล้ว กรุณาเปลี่ยนมุมใบหน้าเล็กน้อย");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ประมวลผลใบหน้าไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    let next = [...samples];
    try {
      for (const file of Array.from(files).slice(0, 5 - next.length)) {
        setMessage(`กำลังตรวจสอบ ${file.name}...`);
        next = [...next, await analyzeImageFile(file)];
        setSamples(next);
      }
      setMessage(`ประมวลผลสำเร็จ ${next.length} ภาพ`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ประมวลผลรูปภาพไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!studentId) {
      setMessage("กรุณาเลือกนักเรียน");
      return;
    }
    if (samples.length < 3) {
      setMessage("กรุณาใช้ภาพใบหน้าอย่างน้อย 3 ภาพ");
      return;
    }
    setBusy(true);
    setMessage("กำลังบันทึกข้อมูลชีวมิติ...");
    try {
      const form = new FormData();
      form.set("studentId", String(studentId));
      form.set(
        "embeddings",
        JSON.stringify(samples.map((sample) => sample.embedding)),
      );
      form.set(
        "qualities",
        JSON.stringify(samples.map((sample) => sample.quality)),
      );
      samples.forEach((sample, index) =>
        form.append("images", sample.blob, `face-${index + 1}.jpg`),
      );
      const response = await fetch("/api/faces", {
          method: existing ? "PUT" : "POST",
          body: form,
        }),
        data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message || "บันทึกข้อมูลใบหน้าไม่สำเร็จ");
      stopCamera();
      await onSaved(data.message || "บันทึกข้อมูลใบหน้าสำเร็จ");
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  const angles = [
    "หน้าตรง",
    "หันซ้ายเล็กน้อย",
    "หันขวาเล็กน้อย",
    "มุมเพิ่มเติม",
    "มุมเพิ่มเติม",
  ];
  return (
    <div
      className="subject-modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="subject-modal face-enroll-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="face-enroll-title"
      >
        <header>
          <div>
            <h2 id="face-enroll-title">
              {existing ? "อัปเดตข้อมูลใบหน้า" : "ลงทะเบียนข้อมูลใบหน้า"}
            </h2>
            <p>ภาพจะถูกประมวลผลบนอุปกรณ์นี้ก่อนจัดเก็บ</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="ปิด">
            <X size={18} />
          </button>
        </header>
        <div className="face-enroll-body">
          <label className="face-student-select">
            นักเรียน <b>*</b>
            <select
              value={studentId || ""}
              disabled={busy || Boolean(initialStudentId)}
              onChange={(event) => {
                setStudentId(Number(event.target.value) || null);
                setSamples([]);
              }}
            >
              <option value="">เลือกนักเรียน</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.code} · {student.name} · {student.className}
                  {student.faceStatus ? " (ลงทะเบียนแล้ว)" : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="face-capture-layout">
            <div className="face-camera-box">
              <video ref={videoRef} autoPlay muted playsInline />
              <div className="face-camera-frame" />
              <span>
                {camera ? "จัดใบหน้าให้อยู่ในกรอบ" : "กล้องยังไม่เปิด"}
              </span>
            </div>
            <div className="face-capture-actions">
              <button
                className="admin-button secondary"
                onClick={camera ? stopCamera : startCamera}
                disabled={busy}
              >
                <Camera size={17} />
                {camera ? "ปิดกล้อง" : "เปิดกล้อง"}
              </button>
              <button
                className="admin-button primary"
                onClick={capture}
                disabled={!camera || busy || samples.length >= 5}
              >
                {busy ? (
                  <LoaderCircle className="face-spin" size={17} />
                ) : (
                  <Camera size={17} />
                )}
                ถ่ายภาพ
              </button>
              <label
                className={`admin-button secondary face-upload ${busy || samples.length >= 5 ? "disabled" : ""}`}
              >
                <ImagePlus size={17} />
                อัปโหลดรูป
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || samples.length >= 5}
                  onChange={(event) => {
                    void upload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="face-sample-grid">
            {angles.map((angle, index) => (
              <article key={index} className={samples[index] ? "ready" : ""}>
                {samples[index] ? (
                  <>
                    <Image
                      src={samples[index].preview}
                      width={180}
                      height={180}
                      unoptimized
                      alt={`ตัวอย่าง ${angle}`}
                    />
                    <button
                      onClick={() =>
                        setSamples((current) =>
                          current.filter(
                            (_, sampleIndex) => sampleIndex !== index,
                          ),
                        )
                      }
                      aria-label={`ลบภาพ ${index + 1}`}
                      disabled={busy}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : (
                  <span>{index + 1}</span>
                )}
                <small>{angle}</small>
              </article>
            ))}
          </div>
          <p className="face-process-message">
            {busy && <LoaderCircle className="face-spin" size={16} />} {message}
          </p>
          {existing && (
            <p className="face-replace-warning">
              การบันทึกจะเปลี่ยนชุดภาพและ embedding เดิมทั้งหมด
            </p>
          )}
        </div>
        <div className="subject-modal-footer">
          <button
            className="admin-button secondary"
            onClick={onClose}
            disabled={busy}
          >
            ยกเลิก
          </button>
          <button
            className="admin-button primary"
            onClick={submit}
            disabled={busy || samples.length < 3}
          >
            {busy && <span className="button-spinner" />}บันทึกข้อมูลใบหน้า (
            {samples.length}/5)
          </button>
        </div>
      </section>
    </div>
  );
}
