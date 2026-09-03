"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanFace } from "lucide-react";

function getCameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) {
    return "ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง";
  }

  switch (error.name) {
    case "NotAllowedError":
      return "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตสิทธิ์กล้องในเบราว์เซอร์";
    case "NotFoundError":
      return "ไม่พบกล้องบนอุปกรณ์นี้";
    case "NotReadableError":
      return "กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น กรุณาปิดโปรแกรมนั้นแล้วลองใหม่";
    case "OverconstrainedError":
      return "กล้องไม่รองรับการตั้งค่าที่ร้องขอ";
    default:
      return "เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้องแล้วลองใหม่";
  }
}

export function CheckInPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;

    setActive(false);
    setStarting(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    const requestId = ++cameraRequestRef.current;
    setStarting(true);
    setCameraError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is unavailable");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setActive(true);
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return;
      stopCamera();
      setCameraError(getCameraErrorMessage(error));
    } finally {
      if (requestId === cameraRequestRef.current) setStarting(false);
    }
  }

  return (
    <div className="checkin-grid">
      <section className={`camera-panel ${active ? "active" : ""}`}>
        <div className="camera-top">
          <span><i />{starting ? "กำลังเปิดกล้อง" : active ? "กล้องกำลังทำงาน" : "กล้องหยุดทำงาน"}</span>
          <b>CAM-01 · อาคารเรียน 1</b>
        </div>

        <div className="face-frame">
          <video ref={videoRef} className="camera-preview" autoPlay muted playsInline aria-label="ภาพสดจากกล้องโน้ตบุ๊ก" />
          <span /><span /><span /><span />
          <ScanFace size={54} />
          <p>{cameraError || (active ? "กำลังค้นหาใบหน้า..." : "กดเริ่มกล้องเพื่อเช็คชื่อ")}</p>
        </div>

        <div className="camera-actions">
          <button className="admin-button primary" onClick={startCamera} disabled={active || starting}>
            <Camera size={18} />{starting ? "กำลังเปิด..." : "เริ่มกล้อง"}
          </button>
          <button className="admin-button danger-button" onClick={stopCamera} disabled={!active && !starting}>
            <CameraOff size={18} />หยุดกล้อง
          </button>
        </div>
      </section>

      <section className="dashboard-card detected-card">
        <div className="card-head">
          <div><h2>ข้อมูลผู้ตรวจพบ</h2><p>ผลการตรวจจับล่าสุด</p></div>
          <span className="normal"><i />พร้อมใช้งาน</span>
        </div>
        <div className="detected-profile">
          <span>--</span>
          <h3>ยังไม่พบข้อมูล</h3>
          <p>{active ? "เปิดกล้องแล้ว รอระบบตรวจจับใบหน้า" : "รอการเปิดกล้อง"}</p>
        </div>
        <dl>
          <div><dt>ชั้นเรียน</dt><dd>-</dd></div>
          <div><dt>เวลาที่ตรวจพบ</dt><dd>-</dd></div>
          <div><dt>ความแม่นยำ</dt><dd>-</dd></div>
          <div><dt>สถานะ</dt><dd><span className="data-badge gray">รอตรวจจับ</span></dd></div>
        </dl>
      </section>
    </div>
  );
}
