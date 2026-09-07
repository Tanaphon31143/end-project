"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, ScanFace, X } from "lucide-react";
import { analyzeVideoFrame, getFaceEngine } from "@/lib/face-recognition";

type Match = {
  matched: boolean;
  similarity: number;
  threshold: number;
  student?: { id: number; code: string; name: string; className: string };
};
export default function FaceRecognitionModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("กำลังเตรียมโมเดล..."),
    [match, setMatch] = useState<Match | null>(null);
  useEffect(() => {
    void getFaceEngine()
      .then(() => setMessage("เปิดกล้องแล้วสแกนใบหน้าเพื่อทดสอบ"))
      .catch(() => setMessage("โหลดโมเดลไม่สำเร็จ"));
    return () =>
      streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  async function start() {
    try {
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
      setMessage("จัดใบหน้าให้อยู่กึ่งกลางกรอบ");
    } catch {
      setMessage("เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้อง");
    }
  }
  async function recognize() {
    if (!videoRef.current) return;
    setBusy(true);
    setMatch(null);
    setMessage("กำลังตรวจจับและเปรียบเทียบใบหน้า...");
    try {
      const sample = await analyzeVideoFrame(videoRef.current),
        response = await fetch("/api/faces/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embedding: sample.embedding }),
        }),
        data = (await response.json()) as Match & { message?: string };
      if (!response.ok) throw new Error(data.message || "จดจำใบหน้าไม่สำเร็จ");
      setMatch(data);
      setMessage(
        data.matched ? "พบข้อมูลใบหน้าที่ตรงกัน" : "ไม่พบใบหน้าที่ตรงกันในระบบ",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="subject-modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="subject-modal face-test-modal"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <h2>ทดสอบ Face Recognition</h2>
            <p>เปรียบเทียบ Face Embedding กับข้อมูลที่เปิดใช้งาน</p>
          </div>
          <button onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </header>
        <div className="face-test-body">
          <div className="face-camera-box">
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="face-camera-frame" />
            <span>{camera ? "พร้อมสแกน" : "กล้องยังไม่เปิด"}</span>
          </div>
          <div className="face-capture-actions">
            <button
              className="admin-button secondary"
              onClick={start}
              disabled={camera || busy}
            >
              <Camera size={17} />
              เปิดกล้อง
            </button>
            <button
              className="admin-button primary"
              onClick={recognize}
              disabled={!camera || busy}
            >
              {busy ? (
                <LoaderCircle className="face-spin" size={17} />
              ) : (
                <ScanFace size={17} />
              )}
              สแกนและค้นหา
            </button>
          </div>
          <p className="face-process-message">{message}</p>
          {match && (
            <div
              className={`face-match-result ${match.matched ? "matched" : "unmatched"}`}
            >
              {match.matched && match.student ? (
                <>
                  <b>{match.student.name}</b>
                  <span>
                    {match.student.code} · {match.student.className}
                  </span>
                </>
              ) : (
                <b>ไม่พบข้อมูลที่ตรงกัน</b>
              )}
              <small>
                ความเหมือน {(match.similarity * 100).toFixed(0)}% · เกณฑ์{" "}
                {(match.threshold * 100).toFixed(0)}%
              </small>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
