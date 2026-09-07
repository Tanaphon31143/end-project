"use client";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraIcon,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import { analyzeVideoFrame, getFaceEngine } from "@/lib/face-recognition";
export type StudentCheckInSession = {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  room: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  lateAfter: string;
  status: "ACTIVE" | "CLOSED";
};
type ScanResult = {
  matched?: boolean;
  alreadyCheckedIn?: boolean;
  similarity?: number;
  message?: string;
  code?: string;
  record?: { checkInTime: string; status: string };
  session?: StudentCheckInSession;
};
type ScanState =
  | "idle"
  | "loading"
  | "ready"
  | "detecting"
  | "success"
  | "error"
  | "duplicate";
export default function FaceScanner({
  initialSession,
}: {
  initialSession: StudentCheckInSession | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user"),
    [state, setState] = useState<ScanState>("idle"),
    [cameraOpen, setCameraOpen] = useState(false),
    [message, setMessage] = useState(
      initialSession
        ? "กดเปิดกล้องเพื่อเริ่มต้น"
        : "ขณะนี้ไม่มีคาบเรียนที่เปิดเช็คชื่อ",
    ),
    [session, setSession] = useState(initialSession),
    [result, setResult] = useState<ScanResult | null>(null);
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }
  async function refreshSession() {
    const response = await fetch("/api/student/check-in", {
        cache: "no-store",
      }),
      data = (await response.json()) as {
        session?: StudentCheckInSession | null;
        message?: string;
      };
    if (!response.ok)
      throw new Error(data.message || "โหลดข้อมูลคาบเรียนไม่สำเร็จ");
    setSession(data.session || null);
    return data.session || null;
  }
  async function openCamera(mode = facing) {
    stopCamera();
    setResult(null);
    setState("loading");
    setMessage("กำลังเตรียมระบบตรวจจับใบหน้า...");
    try {
      const active = await refreshSession();
      if (!active) {
        setState("error");
        setMessage("ขณะนี้ไม่มีคาบเรียนที่เปิดเช็คชื่อ");
        return;
      }
      await getFaceEngine();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
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
      setCameraOpen(true);
      setState("ready");
      setMessage("จัดใบหน้าให้อยู่กึ่งกลางกรอบ");
    } catch (error) {
      stopCamera();
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบสิทธิ์กล้อง",
      );
    }
  }
  async function switchCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await openCamera(next);
  }
  async function scan() {
    if (!videoRef.current || !session || state !== "ready") return;
    setState("detecting");
    setMessage("กำลังตรวจจับและเปรียบเทียบใบหน้า...");
    setResult(null);
    try {
      const sample = await analyzeVideoFrame(videoRef.current);
      const response = await fetch("/api/student/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          embedding: sample.embedding,
        }),
      });
      const data = (await response.json()) as ScanResult;
      if (!response.ok && response.status !== 422 && response.status !== 409)
        throw new Error(data.message || "เช็คชื่อไม่สำเร็จ");
      setResult(data);
      if (data.alreadyCheckedIn) {
        setState("duplicate");
        setMessage(data.message || "คุณเช็คชื่อคาบนี้แล้ว");
      } else if (data.matched) {
        setState("success");
        setMessage("ยืนยันตัวตนและเช็คชื่อสำเร็จ");
      } else {
        setState("error");
        setMessage(data.message || "ใบหน้าไม่ตรงกับข้อมูลที่ลงทะเบียน");
      }
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดระหว่างเช็คชื่อ",
      );
    }
  }
  useEffect(() => () => stopCamera(), []);
  const busy = state === "loading" || state === "detecting";
  return (
    <div className="scanner">
      <div className="camera-view">
        <video ref={videoRef} autoPlay muted playsInline />
        <div className="camera-shade" />
        <div className={`face-frame ${state}`}>
          <span />
          <span />
          <span />
          <span />
        </div>
        {!cameraOpen && (
          <div className="camera-empty">
            <CameraIcon size={46} />
            <p>{session ? "กล้องยังไม่เปิด" : "ไม่มีคาบเรียนที่เปิดอยู่"}</p>
          </div>
        )}
        <div className={`scan-message ${state}`}>
          {busy ? (
            <LoaderCircle className="face-spin" size={18} />
          ) : state === "success" ? (
            <CheckCircle2 size={19} />
          ) : (
            <span className="pulse-dot" />
          )}
          {message}
        </div>
      </div>
      <div className="scanner-actions">
        <button
          className="button secondary"
          onClick={switchCamera}
          disabled={!cameraOpen || busy}
        >
          <SwitchCamera size={18} /> สลับกล้อง
        </button>
        <button
          className="button primary scan-start"
          onClick={
            state === "idle" || state === "error" ? () => openCamera() : scan
          }
          disabled={
            busy || state === "success" || state === "duplicate" || !session
          }
        >
          <Camera size={18} />
          {state === "idle" || state === "error"
            ? "เปิดกล้อง"
            : "เริ่มสแกนใบหน้า"}
        </button>
        <button
          className="button secondary"
          onClick={() => openCamera()}
          disabled={busy}
        >
          <RefreshCw size={18} /> เปิดกล้องใหม่
        </button>
      </div>
      {result && (state === "success" || state === "duplicate") && (
        <div className="scan-success">
          <CheckCircle2 size={27} />
          <div>
            <h3>
              {state === "duplicate" ? "เช็คชื่อคาบนี้แล้ว" : "เช็คชื่อสำเร็จ"}
            </h3>
            <p>
              {(result.session || session)?.subjectName} ·{" "}
              {result.record?.checkInTime || "บันทึกไว้ก่อนหน้านี้"}
            </p>
          </div>
          <span>{result.record?.status || "บันทึกแล้ว"}</span>
        </div>
      )}
    </div>
  );
}
