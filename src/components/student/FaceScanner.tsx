"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Camera,
  CameraIcon,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  DoorOpen,
  GraduationCap,
  Info,
  Layers,
  LoaderCircle,
  Lock,
  Monitor,
  RefreshCw,
  ShieldCheck,
  SwitchCamera,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  analyzeVideoFrame,
  analyzeVideoObservation,
  getFaceEngine,
} from "@/lib/face-recognition";
import type { StudentCheckInSession } from "@/lib/student-check-in";

type LivenessChallenge = "BLINK" | "TURN_LEFT" | "TURN_RIGHT" | "LOOK_UP";
type StudentSummary = {
  name: string;
  code: string;
  className: string;
  initials: string;
  hasProfileImage: boolean;
  faceReady: boolean;
};

const challengeLabels: Record<LivenessChallenge, string> = {
  BLINK: "กะพริบตา",
  TURN_LEFT: "หันหน้าไปทางซ้าย",
  TURN_RIGHT: "หันหน้าไปทางขวา",
  LOOK_UP: "เงยหน้าขึ้นเล็กน้อย",
};

const acceptedGestures: Record<LivenessChallenge, string[]> = {
  BLINK: ["blink left eye", "blink right eye"],
  TURN_LEFT: ["facing left"],
  TURN_RIGHT: ["facing right"],
  LOOK_UP: ["head up"],
};

export type ScanResultData = {
  matched?: boolean;
  alreadyCheckedIn?: boolean;
  similarity?: number;
  confidence?: number;
  message?: string;
  code?: string;
  record?: {
    id?: number;
    checkInTime: string;
    status: string;
    confidence?: number;
  };
  session?: StudentCheckInSession;
  remainingAttempts?: number;
};

type ScanStep =
  | "INIT_CAMERA"
  | "FACE_DETECTION"
  | "LIVENESS"
  | "MATCHING"
  | "SAVING"
  | "COMPLETED";

const DISPLAY_STEPS = [
  { num: 1, label: "เปิดกล้อง", hint: "เริ่มต้นการสแกน" },
  { num: 2, label: "ตรวจจับใบหน้า", hint: "ระบบกำลังตรวจสอบ" },
  { num: 3, label: "ยืนยันตัวตน", hint: "เปรียบเทียบข้อมูล" },
  { num: 4, label: "เช็คชื่อสำเร็จ", hint: "บันทึกเวลาเรียน" },
] as const;

const bangkokTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const bangkokDateFormatter = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function getBangkokTimestamp(sessionDate: string, time: string) {
  return Date.parse(`${sessionDate}T${time.length === 5 ? `${time}:00` : time}+07:00`);
}

export default function FaceScanner({
  initialSessions = [],
  preferredSessionId,
  student,
}: {
  initialSessions: StudentCheckInSession[];
  preferredSessionId?: number;
  student?: StudentSummary;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [sessions, setSessions] =
    useState<StudentCheckInSession[]>(initialSessions);
  const [selectedSession, setSelectedSession] =
    useState<StudentCheckInSession | null>(() => {
      if (preferredSessionId) {
        const found = initialSessions.find((s) => s.id === preferredSessionId);
        if (found) return found;
      }
      return initialSessions.length === 1 ? initialSessions[0] : null;
    });
  const [sessionModalOpen, setSessionModalOpen] = useState(
    initialSessions.length > 1 &&
      !initialSessions.some((s) => s.id === preferredSessionId),
  );

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ScanStep | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [result, setResult] = useState<ScanResultData | null>(null);
  const [scanStatus, setScanStatus] = useState<
    "idle" | "success" | "duplicate" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentChallenge, setCurrentChallenge] =
    useState<LivenessChallenge | null>(null);
  const [challengeNumber, setChallengeNumber] = useState(0);
  const [clockNow, setClockNow] = useState<number | null>(null);

  useEffect(() => {
    const updateClock = () => setClockNow(Date.now());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const attendanceWindow = useMemo(() => {
    if (!selectedSession) {
      return {
        availability: "EMPTY" as const,
        remainingSeconds: 0,
        progress: 0,
      };
    }

    const start = getBangkokTimestamp(
      selectedSession.sessionDate,
      selectedSession.startTime,
    );
    const end = getBangkokTimestamp(
      selectedSession.sessionDate,
      selectedSession.endTime,
    );
    if (clockNow === null) {
      return {
        availability: selectedSession.availability,
        remainingSeconds: selectedSession.remainingSeconds,
        progress: 0,
      };
    }

    const now = clockNow;
    const availability =
      now < start ? "UPCOMING" : now > end ? "ENDED" : "OPEN";
    const duration = Math.max(1, end - start);

    return {
      availability,
      remainingSeconds: Math.max(0, Math.floor((end - now) / 1000)),
      progress: Math.max(0, Math.min(100, ((now - start) / duration) * 100)),
    };
  }, [clockNow, selectedSession]);

  const visualStep =
    scanStatus === "success" || scanStatus === "duplicate"
      ? 4
      : currentStep === "LIVENESS" ||
          currentStep === "MATCHING" ||
          currentStep === "SAVING" ||
          currentStep === "COMPLETED"
        ? 3
        : cameraOpen || currentStep === "FACE_DETECTION"
          ? 2
          : 1;

  // Rate Limiting
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const isSelectedSessionOpen = attendanceWindow.availability === "OPEN";
  const selectedSessionEnded = attendanceWindow.availability === "ENDED";
  const sessionNotOpenMessage = selectedSession
    ? selectedSessionEnded
      ? `คาบนี้ปิดรับเช็คชื่อแล้วเมื่อ ${selectedSession.endTime} น.`
      : `คาบนี้เปิดให้เช็คชื่อเวลา ${selectedSession.startTime}–${selectedSession.endTime} น.`
    : "";

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  async function fetchSessions() {
    try {
      const res = await fetch("/api/student/check-in", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setSessions(data.sessions || []);
        if (data.rateLimit?.isLimited) {
          setLockoutRemaining(data.rateLimit.retryAfterSeconds || 60);
        }
        return data.sessions as StudentCheckInSession[];
      }
    } catch {
      setErrorMessage(
        "เชื่อมต่อระบบคาบเรียนไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่",
      );
    }
    return [];
  }

  async function completeChallenge(
    video: HTMLVideoElement,
    challenge: LivenessChallenge,
  ) {
    const deadline = Date.now() + 10_000;
    let lastError: unknown;
    while (Date.now() < deadline) {
      try {
        const observation = await analyzeVideoObservation(video);
        if (
          observation.real >= 0.65 &&
          observation.live >= 0.55 &&
          observation.gestures.some((gesture) =>
            acceptedGestures[challenge].includes(gesture),
          )
        ) {
          return {
            challenge,
            gestures: observation.gestures,
            real: observation.real,
            live: observation.live,
            capturedAt: Date.now(),
          };
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(
      lastError instanceof Error
        ? `หมดเวลาตรวจบุคคลจริง: ${lastError.message}`
        : `ไม่พบการเคลื่อนไหว “${challengeLabels[challenge]}” ภายใน 10 วินาที`,
    );
  }

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const t = setInterval(() => {
      setLockoutRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [lockoutRemaining]);

  async function openCamera(mode = facing) {
    if (lockoutRemaining > 0) return;
    if (!selectedSession) {
      setSessionModalOpen(true);
      return;
    }
    if (!selectedSession.isOpenNow) {
      setScanStatus("error");
      setErrorMessage(sessionNotOpenMessage);
      return;
    }

    stopCamera();
    setResult(null);
    setScanStatus("idle");
    setErrorMessage("");
    setCurrentStep("INIT_CAMERA");
    setIsProcessing(true);

    try {
      // Verify sessions are still active
      const latestSessions = await fetchSessions();
      const current = latestSessions.find((s) => s.id === selectedSession.id);
      if (!current) {
        throw new Error("คาบเรียนนี้ปิดแล้วหรือไม่พร้อมให้เช็คชื่อ");
      }
      if (!current.isOpenNow) {
        throw new Error(
          current.availability === "ENDED"
            ? `คาบนี้ปิดรับเช็คชื่อแล้วเมื่อ ${current.endTime} น.`
            : `คาบนี้เปิดให้เช็คชื่อเวลา ${current.startTime}–${current.endTime} น.`,
        );
      }
      setSelectedSession(current);

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
      setCurrentStep(null);
    } catch (err) {
      stopCamera();
      setScanStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "ไม่สามารถเปิดกล้องได้ โปรดอนุญาตการเข้าถึงกล้องและลองใหม่",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function switchCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await openCamera(next);
  }

  // Multi-step Scan Workflow (Steps 2 to 6)
  async function startScan() {
    if (
      !videoRef.current ||
      !selectedSession ||
      isProcessing ||
      lockoutRemaining > 0
    ) {
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setScanStatus("idle");
    setErrorMessage("");

    try {
      // Step 2: Face Detection
      setCurrentStep("FACE_DETECTION");
      await new Promise((r) => setTimeout(r, 200));

      const video = videoRef.current;
      await analyzeVideoObservation(video);

      // Step 3: server-issued randomized interactive liveness
      setCurrentStep("LIVENESS");
      const challengeResponse = await fetch("/api/student/liveness-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      const challengeData = (await challengeResponse.json()) as {
        token?: string;
        challenges?: LivenessChallenge[];
        message?: string;
      };
      if (
        !challengeResponse.ok ||
        !challengeData.token ||
        !challengeData.challenges
      ) {
        throw new Error(
          challengeData.message || "ไม่สามารถเริ่มการตรวจบุคคลจริงได้",
        );
      }
      const livenessEvidence = [];
      for (let index = 0; index < challengeData.challenges.length; index += 1) {
        const challenge = challengeData.challenges[index];
        setChallengeNumber(index + 1);
        setCurrentChallenge(challenge);
        livenessEvidence.push(await completeChallenge(video, challenge));
      }
      setCurrentChallenge(null);
      const sample = await analyzeVideoFrame(video);

      // Step 4: Matching
      setCurrentStep("MATCHING");
      await new Promise((r) => setTimeout(r, 250));

      // Step 5: Saving & Server Validation
      setCurrentStep("SAVING");

      const response = await fetch("/api/student/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          embedding: sample.embedding,
          livenessToken: challengeData.token,
          livenessEvidence,
          deviceInfo: navigator.userAgent.slice(0, 150),
        }),
      });

      const data = (await response.json()) as ScanResultData;
      setCurrentStep("COMPLETED");

      if (response.status === 429) {
        setLockoutRemaining(
          (data as { retryAfterSeconds?: number }).retryAfterSeconds || 600,
        );
        setScanStatus("error");
        setErrorMessage(
          data.message || "ระบบล็อกชั่วคราวเนื่องจากสแกนผิดหลายครั้ง",
        );
        return;
      }

      setResult(data);

      if (data.alreadyCheckedIn) {
        setScanStatus("duplicate");
      } else if (data.matched) {
        setScanStatus("success");
      } else {
        setScanStatus("error");
        setErrorMessage(data.message || "ใบหน้าไม่ตรงกับข้อมูลที่ลงทะเบียน");
      }
    } catch (error) {
      setCurrentStep("COMPLETED");
      setScanStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการสแกนใบหน้า",
      );
    } finally {
      setCurrentChallenge(null);
      setChallengeNumber(0);
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function formatRemainingTime(seconds?: number) {
    if (!seconds || seconds <= 0) return "หมดเวลาแล้ว";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 60) {
      const h = Math.floor(m / 60);
      return `เหลือ ${h} ชม. ${m % 60} นาที`;
    }
    return `เหลือ ${m}:${s < 10 ? `0${s}` : s} นาที`;
  }

  if (sessions.length === 0) {
    return (
      <section className="scan-empty-state card">
        <span className="scan-empty-icon" aria-hidden="true">
          <CalendarDays />
        </span>
        <div>
          <h2>วันนี้ไม่มีคาบเรียนที่สามารถเช็คชื่อได้</h2>
          <p>เมื่อครูเปิดรอบเช็คชื่อ คาบเรียนจะปรากฏบนหน้านี้โดยอัตโนมัติ</p>
        </div>
        <Link href="/student/courses" className="button primary">
          ดูตารางเรียน <ChevronRight />
        </Link>
      </section>
    );
  }

  return (
    <div className="scanner-container">
      {lockoutRemaining > 0 && (
        <div className="scan-lockout-banner card">
          <Lock size={28} className="danger-icon" />
          <div>
            <strong>บัญชีถูกล็อกชั่วคราว</strong>
            <p>
              คุณสแกนผิดพลาดเกิน 5 ครั้งใน 10 นาที สามารถลองสแกนใหม่ได้ในอีก{" "}
              <b>
                {Math.floor(lockoutRemaining / 60)}:
                {lockoutRemaining % 60 < 10
                  ? `0${lockoutRemaining % 60}`
                  : lockoutRemaining % 60}{" "}
                นาที
              </b>
            </p>
          </div>
        </div>
      )}

      <div className="scan-overview-grid">
        <section className="scan-course-card card">
          <div className="scan-course-heading">
            <span className="scan-course-icon" aria-hidden="true">
              <BookOpen />
            </span>
            <div className="scan-course-copy">
              <span>คาบเรียนที่เลือก</span>
              {selectedSession ? (
                <>
                  <h2>{selectedSession.subjectName}</h2>
                  <small>{selectedSession.subjectCode}</small>
                </>
              ) : (
                <h2>กรุณาเลือกคาบเรียน</h2>
              )}
            </div>
            {sessions.length > 1 && (
              <button
                type="button"
                className="scan-change-session"
                onClick={() => {
                  stopCamera();
                  setSessionModalOpen(true);
                }}
                disabled={isProcessing}
              >
                <Layers /> เปลี่ยนคาบ
              </button>
            )}
          </div>

          {selectedSession && (
            <div className="scan-course-facts">
              <div>
                <Monitor aria-hidden="true" />
                <span>ห้องเรียน<strong>{selectedSession.room}</strong></span>
              </div>
              <div>
                <GraduationCap aria-hidden="true" />
                <span>ระดับชั้น / ห้อง<strong>{student?.className || "ไม่ระบุ"}</strong></span>
              </div>
              <div>
                <UserRound aria-hidden="true" />
                <span>ครูผู้สอน<strong>{selectedSession.teacherName}</strong></span>
              </div>
              <div>
                <Clock aria-hidden="true" />
                <span>เวลาเรียน<strong>{selectedSession.startTime}–{selectedSession.endTime} น.</strong></span>
              </div>
            </div>
          )}
        </section>

        <section
          className={`scan-window-card card is-${attendanceWindow.availability.toLowerCase()}`}
          aria-live="polite"
        >
          <div className="scan-window-status">
            <span>
              <i />
              {selectedSession?.alreadyCheckedIn
                ? "เช็คชื่อแล้ว"
                : attendanceWindow.availability === "OPEN"
                  ? "เปิดให้เช็คชื่อ"
                  : attendanceWindow.availability === "UPCOMING"
                    ? "ยังไม่ถึงเวลาเช็คชื่อ"
                    : "หมดเวลาเช็คชื่อแล้ว"}
            </span>
            <strong>
              {attendanceWindow.availability === "OPEN"
                ? formatRemainingTime(attendanceWindow.remainingSeconds)
                : selectedSession?.alreadyCheckedIn
                  ? "บันทึกเรียบร้อย"
                  : attendanceWindow.availability === "UPCOMING"
                    ? `เปิด ${selectedSession?.startTime || "--:--"} น.`
                    : `ปิด ${selectedSession?.endTime || "--:--"} น.`}
            </strong>
          </div>
          <time className="scan-live-clock">
            {clockNow ? `${bangkokTimeFormatter.format(clockNow)} น.` : "--:--:-- น."}
          </time>
          <div className="scan-live-date">
            <CalendarDays aria-hidden="true" />
            <span>{clockNow ? bangkokDateFormatter.format(clockNow) : "กำลังโหลดวันที่"}</span>
          </div>
          <div className="scan-window-progress" aria-hidden="true">
            <span style={{ width: `${attendanceWindow.progress}%` }} />
          </div>
          <div className="scan-window-times">
            <span>เปิด {selectedSession?.startTime || "--:--"} น.</span>
            <span>ปิด {selectedSession?.endTime || "--:--"} น.</span>
          </div>
        </section>
      </div>

      {sessionModalOpen && (
        <div className="student-modal-layer">
          <div
            className="student-modal card session-select-modal"
            role="dialog"
          >
            <header>
              <div>
                <h2>เลือกคาบเรียนที่ต้องการเช็คชื่อ</h2>
                <p>
                  มีคาบเรียนเปิดให้เช็คชื่อพร้อมกัน {sessions.length} คาบ
                  กรุณาเลือกวิชาของคุณ
                </p>
              </div>
            </header>

            <div className="session-cards-list">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`session-card-option ${
                    selectedSession?.id === s.id ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedSession(s);
                    setSessionModalOpen(false);
                    stopCamera();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedSession(s);
                      setSessionModalOpen(false);
                      stopCamera();
                    }
                  }}
                >
                  <div className="session-card-header">
                    <span className="badge info">{s.subjectCode}</span>
                    <span className="session-countdown">
                      <Clock size={13} />{" "}
                      {formatRemainingTime(s.remainingSeconds)}
                    </span>
                  </div>

                  <h4>{s.subjectName}</h4>

                  <div className="session-card-meta">
                    <span>
                      <UserRound size={14} /> {s.teacherName}
                    </span>
                    <span>
                      <DoorOpen size={14} /> ห้อง {s.room}
                    </span>
                    <span>
                      <Clock size={14} /> {s.startTime} – {s.endTime} น.
                    </span>
                  </div>

                  {s.alreadyCheckedIn && (
                    <div className="already-checked-tag">
                      <CheckCircle2 size={14} /> คุณเคยเช็คชื่อในคาบนี้แล้ว
                    </div>
                  )}
                  {!s.isOpenNow && (
                    <div className="already-checked-tag">
                      <Clock size={14} />
                      {s.availability === "ENDED"
                        ? `ปิดรับเช็คชื่อแล้วเมื่อ ${s.endTime} น.`
                        : `เปิดเช็คชื่อเวลา ${s.startTime} น.`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setSessionModalOpen(false)}
                disabled={!selectedSession}
              >
                ปิด
              </button>
            </footer>
          </div>
        </div>
      )}

      {selectedSession && !isSelectedSessionOpen && (
        <div
          className={`scan-result-card card ${selectedSessionEnded ? "expired" : "error"}`}
        >
          <div className="result-header">
            <Clock size={32} className="danger-icon" />
            <div>
              <h3>
                {selectedSessionEnded
                  ? "หมดเวลาเช็คชื่อแล้ว"
                  : "ยังไม่ถึงเวลาเปิดเช็คชื่อ"}
              </h3>
              <p className="error-desc">
                {sessionNotOpenMessage}{" "}
                {selectedSessionEnded
                  ? "กรุณาติดต่อครูผู้สอนหากต้องการแจ้งปัญหาการเช็คชื่อ"
                  : "กล้องจะพร้อมใช้งานเมื่อถึงเวลาเปิดคาบ"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="scan-workspace-grid">
        <section className="scan-camera-card card">
          <div className="scan-steps" aria-label={`ขั้นตอนที่ ${visualStep} จาก 4`}>
            {DISPLAY_STEPS.map((step) => {
              const isDone = step.num < visualStep;
              const isActive = step.num === visualStep;
              return (
                <div
                  key={step.num}
                  className={`scan-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
                >
                  <span>{isDone ? <Check /> : step.num}</span>
                  <div><strong>{step.label}</strong><small>{step.hint}</small></div>
                </div>
              );
            })}
          </div>

          <div className="scanner">
            <div className="camera-view">
              <video ref={videoRef} autoPlay muted playsInline />
              <div className="camera-shade" />
              <span className="camera-quality"><CameraIcon /> HD</span>
              <button
                type="button"
                className="camera-switch"
                onClick={switchCamera}
                disabled={!cameraOpen || isProcessing}
              >
                <SwitchCamera /> สลับกล้อง
              </button>

              <div
                className={`face-frame ${scanStatus} ${isProcessing ? "detecting" : ""}`}
              >
                <span />
                <span />
                <span />
                <span />
              </div>

              {!cameraOpen && (
                <div className="camera-empty">
                  <CameraIcon size={48} />
                  <strong>กล้องยังไม่เปิด</strong>
                  <p>{selectedSession ? "กดปุ่มด้านล่างเพื่อเริ่มสแกนใบหน้า" : "กรุณาเลือกคาบเรียน"}</p>
                </div>
              )}

              {cameraOpen && (
                <div className={`scan-message ${scanStatus}`}>
                  {isProcessing ? (
                    <>
                      <LoaderCircle className="face-spin" size={18} />
                      <span>
                        {currentStep === "INIT_CAMERA" && "กำลังเปิดและเตรียมกล้อง..."}
                        {currentStep === "FACE_DETECTION" && "กำลังตรวจจับตำแหน่งใบหน้า..."}
                        {currentStep === "LIVENESS" && "กำลังตรวจจับบุคคลจริง (Liveness)..."}
                        {currentStep === "MATCHING" && "กำลังเปรียบเทียบข้อมูลใบหน้า..."}
                        {currentStep === "SAVING" && "กำลังบันทึกผลการเข้าเรียน..."}
                        {currentStep === "COMPLETED" && "ประมวลผลเสร็จสิ้น"}
                      </span>
                    </>
                  ) : scanStatus === "success" ? (
                    <><CheckCircle2 size={18} /><span>ยืนยันตัวตนสำเร็จ</span></>
                  ) : scanStatus === "duplicate" ? (
                    <><AlertCircle size={18} /><span>เช็คชื่อคาบนี้แล้ว</span></>
                  ) : scanStatus === "error" ? (
                    <><XCircle size={18} /><span>{errorMessage || "สแกนไม่สำเร็จ"}</span></>
                  ) : (
                    <><UserRound size={18} /><span>วางใบหน้าให้อยู่ในกรอบ</span></>
                  )}
                </div>
              )}

              {currentChallenge && (
                <div className="liveness-challenge" role="status" aria-live="assertive">
                  <small>ขั้นที่ {challengeNumber} จาก 2 · ทำภายใน 10 วินาที</small>
                  <strong>{challengeLabels[currentChallenge]}</strong>
                  <span>มองกล้องและขยับอย่างเป็นธรรมชาติ</span>
                </div>
              )}
            </div>

            <div className="scanner-actions">
              <button
                type="button"
                className="button primary scan-start"
                onClick={!cameraOpen ? () => openCamera() : startScan}
                disabled={isProcessing || lockoutRemaining > 0 || scanStatus === "success" || !selectedSession || !isSelectedSessionOpen}
              >
                <Camera size={19} />
                {!cameraOpen ? "เปิดกล้องเพื่อเช็คชื่อ" : isProcessing ? "กำลังประมวลผล..." : "สแกนใบหน้าเพื่อเช็คชื่อ"}
                <ChevronRight size={18} />
              </button>
              {cameraOpen && (
                <button
                  type="button"
                  className="button secondary scan-restart"
                  onClick={() => openCamera()}
                  disabled={isProcessing || lockoutRemaining > 0 || !isSelectedSessionOpen}
                >
                  <RefreshCw size={18} /> เริ่มกล้องใหม่
                </button>
              )}
            </div>

            <div className="scan-trust-row">
              <span><ShieldCheck /> ตรวจจับใบหน้าอัตโนมัติ</span>
              <span><Lock /> Liveness Detection ป้องกันการสวมรูป</span>
              <span><ShieldCheck /> ข้อมูลถูกเข้ารหัสและปลอดภัย</span>
            </div>
          </div>

          {result && (scanStatus === "success" || scanStatus === "duplicate") && (
            <div className={`scan-result-card card ${scanStatus}`}>
            <div className="result-header">
              {student?.hasProfileImage ? (
                <Image
                  className="result-student-photo"
                  src="/api/student/profile-image"
                  alt={`รูปของ ${student.name}`}
                  width={56}
                  height={56}
                  unoptimized
                />
              ) : (
                <span className="result-student-avatar" aria-hidden="true">
                  {student?.initials || <CheckCircle2 size={28} />}
                </span>
              )}
              <div>
                <h3>
                  {scanStatus === "duplicate"
                    ? "เช็คชื่อคาบนี้แล้ว"
                    : "เช็คชื่อสำเร็จ"}
                </h3>
                <p>
                  {student
                    ? `${student.name} · ${student.code} · ${student.className}`
                    : result.message}
                </p>
              </div>
            </div>

            <div className="result-details-grid">
              <div className="result-field">
                <span>วันที่</span>
                <strong>
                  {new Intl.DateTimeFormat("th-TH", {
                    dateStyle: "long",
                  }).format(
                    new Date(
                      `${(result.session || selectedSession)?.sessionDate}T00:00:00`,
                    ),
                  )}
                </strong>
              </div>
              <div className="result-field">
                <span>รายวิชา</span>
                <strong>
                  {(result.session || selectedSession)?.subjectCode}{" "}
                  {(result.session || selectedSession)?.subjectName}
                </strong>
              </div>
              <div className="result-field">
                <span>คาบและเวลาเรียน</span>
                <strong>
                  {(result.session || selectedSession)?.periodName} ·{" "}
                  {(result.session || selectedSession)?.startTime}–
                  {(result.session || selectedSession)?.endTime} น.
                </strong>
              </div>
              <div className="result-field">
                <span>ห้องเรียน</span>
                <strong>{(result.session || selectedSession)?.room}</strong>
              </div>
              <div className="result-field">
                <span>ครูผู้สอน</span>
                <strong>
                  {(result.session || selectedSession)?.teacherName}
                </strong>
              </div>
              <div className="result-field">
                <span>เวลาเช็คชื่อ</span>
                <strong>{result.record?.checkInTime || "บันทึกแล้ว"} น.</strong>
              </div>
              <div className="result-field">
                <span>สถานะเข้าเรียน</span>
                <span
                  className={`badge ${
                    result.record?.status === "สาย" ? "warning" : "success"
                  }`}
                >
                  {result.record?.status || "มาเรียน"}
                </span>
              </div>
              <div className="result-field">
                <span>ผลยืนยันใบหน้า</span>
                <strong>
                  {Number(result.confidence || 0) >= 80
                    ? "ความมั่นใจสูง"
                    : "ผ่านเกณฑ์"}
                </strong>
              </div>
            </div>
            </div>
          )}

          {scanStatus === "error" && errorMessage && (
            <div className="scan-result-card card error">
            <div className="result-header">
              <XCircle size={32} className="danger-icon" />
              <div>
                <h3>การสแกนไม่สำเร็จ</h3>
                <p className="error-desc">{errorMessage}</p>
                {result?.remainingAttempts !== undefined &&
                  result.remainingAttempts > 0 && (
                    <small className="attempt-warning">
                      คุณสามารถลองใหม่ได้อีก {result.remainingAttempts} ครั้ง
                      ก่อนระบบล็อกชั่วคราว
                    </small>
                  )}
              </div>
            </div>
            <div className="result-actions">
              <button
                type="button"
                className="button primary"
                onClick={startScan}
                disabled={isProcessing || lockoutRemaining > 0}
              >
                <RefreshCw size={16} /> ลองสแกนใหม่อีกครั้ง
              </button>
            </div>
            </div>
          )}
        </section>

        <aside className="scan-guide-column">
          <section className="scan-guide-card card">
            <header><Info /><h2>คำแนะนำในการเช็คชื่อ</h2></header>
            <ul>
              <li><Check /><span>อยู่ในที่ที่มีแสงสว่างเพียงพอ</span></li>
              <li><Check /><span>มองตรงไปที่กล้อง</span></li>
              <li><Check /><span>ไม่สวมหมวก แว่นดำ หรือสิ่งที่ปิดบังใบหน้า</span></li>
              <li><Check /><span>อยู่ในกรอบที่กำหนดจนกว่าระบบจะยืนยัน</span></li>
              <li className="is-warning"><XCircle /><span>ห้ามใช้รูปภาพหรือวิดีโอในการเช็คชื่อ</span></li>
            </ul>
          </section>

          <section className="scan-safety-card card">
            <ShieldCheck />
            <div>
              <h2>มาตรการความปลอดภัย</h2>
              <p>ระบบใช้การตรวจจับการมีชีวิตจริง (Liveness Detection) และเข้ารหัสข้อมูล เพื่อป้องกันการสวมรูปและรักษาความปลอดภัยของข้อมูลนักเรียน</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
