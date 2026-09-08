"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  LoaderCircle,
  RefreshCw,
  ScanFace,
  SwitchCamera,
  X,
} from "lucide-react";
import {
  analyzeVideoFrame,
  getFaceEngine,
  resetFaceEngine,
} from "@/lib/face-recognition";

type AttendanceRow = {
  id: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
  confidence: number | null;
  checkInTime: string | null;
  student: { studentCode: string; fullName: string };
};
type SessionData = {
  id: string;
  status: "ACTIVE" | "CLOSED";
  startTime: string;
  endTime: string;
  lateAfter: string;
  totalStudents: number;
  subject: {
    subjectCode: string;
    subjectName: string;
    classroom: { name: string } | null;
  };
  attendance: AttendanceRow[];
};
type Match = {
  similarity: number;
  liveness: number;
  student: { id: number; code: string; name: string; className: string };
};
const labels = {
  PRESENT: "เข้าเรียน",
  LATE: "มาสาย",
  ABSENT: "ขาดเรียน",
  LEAVE: "ลา",
};
const time = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
      }).format(new Date(value))
    : "-";
const dbTime = (value: string) => {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
};
const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function LiveScanFeed({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [message, setMessage] = useState("กำลังโหลดรอบเช็คชื่อ...");
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [studentImageFailed, setStudentImageFailed] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);
  const loadSession = useCallback(async () => {
    const response = await fetch(
      `/api/teacher/attendance?sessionId=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || "โหลดรอบเช็คชื่อไม่สำเร็จ");
    setSession(data);
    if (data.status === "CLOSED") stopCamera();
    return data as SessionData;
  }, [sessionId, stopCamera]);
  useEffect(() => {
    const initial = window.setTimeout(
      () =>
        loadSession().catch((cause) =>
          setError(
            cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ",
          ),
        ),
      0,
    );
    const timer = window.setInterval(() => loadSession().catch(() => {}), 3000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      stopCamera();
    };
  }, [loadSession, stopCamera]);

  async function openCamera(mode = facing) {
    setBusy(true);
    setError("");
    setMessage("กำลังเตรียมระบบตรวจจับใบหน้า...");
    stopCamera();
    try {
      const current = await loadSession();
      if (current.status !== "ACTIVE") throw new Error("รอบเช็คชื่อนี้ปิดแล้ว");
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง");
      let lastError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setRetryCount(attempt - 1);
          if (attempt > 1) {
            resetFaceEngine();
            setMessage(`กำลังลองเชื่อมต่อใหม่ ครั้งที่ ${attempt - 1}/2...`);
            await wait(650);
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
          setRetryCount(0);
          setMessage(
            "จัดใบหน้าให้อยู่กึ่งกลางกรอบ กะพริบตาหรือขยับใบหน้าเล็กน้อย แล้วกดสแกน",
          );
          return;
        } catch (cause) {
          lastError = cause;
          const name = cause instanceof DOMException ? cause.name : "";
          if (name === "NotAllowedError" || name === "NotFoundError") break;
        }
      }
      throw lastError;
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      const detail =
        name === "NotAllowedError"
          ? "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตสิทธิ์กล้องในเบราว์เซอร์"
          : name === "NotFoundError"
            ? "ไม่พบกล้องบนอุปกรณ์นี้"
            : cause instanceof Error
              ? cause.message
              : "ไม่สามารถเปิดกล้องได้";
      setError(detail);
      setMessage("กล้องหรือโมเดลยังไม่พร้อม กดลองเชื่อมต่อใหม่ได้");
    } finally {
      setBusy(false);
    }
  }
  async function switchCamera() {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await openCamera(next);
  }
  async function scan() {
    if (!videoRef.current || !cameraOpen) return;
    setBusy(true);
    setMatch(null);
    setError("");
    setMessage("กำลังตรวจสอบบุคคลจริงและเปรียบเทียบใบหน้า...");
    try {
      const sample = await analyzeVideoFrame(videoRef.current);
      const response = await fetch("/api/faces/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, embedding: sample.embedding }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "ตรวจสอบใบหน้าไม่สำเร็จ");
      if (!data.matched) {
        setMessage("ไม่พบข้อมูลใบหน้าในรายชื่อนักเรียนของรอบนี้");
        setError(
          "ไม่พบข้อมูลนักเรียนในรายวิชานี้ จึงยังไม่มีการบันทึกการเข้าเรียน",
        );
        return;
      }
      setStudentImageFailed(false);
      setMatch({ ...data, liveness: sample.liveness });
      setMessage("พบข้อมูลนักเรียน กรุณาตรวจสอบและยืนยัน");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "ตรวจจับใบหน้าไม่สำเร็จ",
      );
      setMessage("ลองจัดใบหน้าให้อยู่ในกรอบ หรือกดลองเชื่อมต่อใหม่");
    } finally {
      setBusy(false);
    }
  }
  async function confirmAttendance() {
    if (!match) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          studentId: match.student.id,
          confidence: match.similarity * 100,
        }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409)
        throw new Error(data.message || "บันทึกไม่สำเร็จ");
      setMessage(
        data.alreadyCheckedIn
          ? "นักเรียนคนนี้เช็คชื่อแล้ว"
          : "บันทึกการเข้าเรียนสำเร็จ",
      );
      setMatch(null);
      await loadSession();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  async function closeSession() {
    if (
      !window.confirm(
        "ปิดรอบเช็คชื่อและบันทึกนักเรียนที่ยังไม่เช็คชื่อเป็นขาดเรียนหรือไม่?",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch("/api/teacher/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "ปิดรอบไม่สำเร็จ");
      stopCamera();
      router.push("/teacher/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ปิดรอบไม่สำเร็จ");
      setBusy(false);
    }
  }

  if (!session)
    return (
      <div className="panel empty">
        {error || (
          <>
            <LoaderCircle className="spin" size={22} /> กำลังโหลดรอบเช็คชื่อ...
          </>
        )}
      </div>
    );
  const checked = session.attendance.filter(
    (item) => item.status === "PRESENT" || item.status === "LATE",
  ).length;
  return (
    <>
      <div className="page-head">
        <div>
          <h2>เช็คชื่อด้วยใบหน้า</h2>
          <p>
            {session.subject.subjectCode} · {session.subject.subjectName}{" "}
            {session.subject.classroom?.name} · {dbTime(session.startTime)}–
            {dbTime(session.endTime)} น.
          </p>
        </div>
        <button
          className="button danger"
          onClick={closeSession}
          disabled={busy || session.status === "CLOSED"}
        >
          {session.status === "CLOSED" ? "ปิดรอบแล้ว" : "ปิดรอบเช็คชื่อ"}
        </button>
      </div>
      <section className="scan-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>กล้องตรวจจับใบหน้า</h3>
              <span className="muted">
                เปิดใช้ Liveness Detection เพื่อป้องกันรูปถ่ายและวิดีโอ
              </span>
            </div>
            <span className={`status ${cameraOpen ? "active" : "closed"}`}>
              {cameraOpen ? "● ออนไลน์" : "● ปิดอยู่"}
            </span>
          </div>
          <div className="camera">
            <video ref={videoRef} autoPlay muted playsInline />
            <div className="camera-corners" />
            {!cameraOpen && <ScanFace size={55} />}
            <p>
              {busy && <LoaderCircle className="spin" size={16} />} {message}
            </p>
          </div>
          <div className="scan-controls">
            <button
              className="button ghost"
              onClick={() => void openCamera()}
              disabled={busy || session.status === "CLOSED"}
            >
              <Camera size={17} />
              {error
                ? "ลองเชื่อมต่อใหม่"
                : cameraOpen
                  ? "เปิดกล้องใหม่"
                  : "เปิดกล้อง"}
            </button>
            <button
              className="button ghost"
              onClick={() => void switchCamera()}
              disabled={busy || !cameraOpen}
            >
              <SwitchCamera size={17} />
              สลับกล้อง
            </button>
            <button
              className="button primary"
              onClick={() => void scan()}
              disabled={busy || !cameraOpen || session.status === "CLOSED"}
            >
              <RefreshCw size={17} />
              สแกนใบหน้า
            </button>
          </div>
          {retryCount > 0 && (
            <p className="form-message">
              ลองเชื่อมต่อใหม่แล้ว {retryCount} ครั้ง
            </p>
          )}
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
        </article>
        <article className="panel student-result">
          <h3>{match ? "ตรวจพบนักเรียน" : "รอผลการตรวจจับ"}</h3>
          {match ? (
            <>
              {studentImageFailed ? (
                <div className="profile-photo">
                  {match.student.name.slice(0, 2)}
                </div>
              ) : (
                <Image
                  className="profile-photo student-photo"
                  src={`/api/teacher/student-image?sessionId=${encodeURIComponent(sessionId)}&studentId=${match.student.id}`}
                  width={104}
                  height={104}
                  alt={`รูปของ ${match.student.name}`}
                  onError={() => setStudentImageFailed(true)}
                  unoptimized
                />
              )}
              <h3>{match.student.name}</h3>
              <p className="muted">
                {match.student.code} · {match.student.className}
              </p>
              <div className="detail-list">
                <div className="detail-row">
                  <span>เวลา</span>
                  <b>
                    {new Intl.DateTimeFormat("th-TH", {
                      timeStyle: "medium",
                      timeZone: "Asia/Bangkok",
                    }).format(new Date())}{" "}
                    น.
                  </b>
                </div>
                <div className="detail-row">
                  <span>ความมั่นใจ</span>
                  <b className="green">
                    {(match.similarity * 100).toFixed(1)}%
                  </b>
                </div>
                <div className="detail-row">
                  <span>Liveness</span>
                  <b className="green">{(match.liveness * 100).toFixed(1)}%</b>
                </div>
                <div className="confidence">
                  <i style={{ width: `${match.similarity * 100}%` }} />
                </div>
              </div>
              <div className="course-actions">
                <button
                  className="button danger"
                  onClick={() => {
                    setMatch(null);
                    setMessage("ยกเลิกผลแล้ว พร้อมสแกนใหม่");
                  }}
                  disabled={busy}
                >
                  <X size={16} />
                  ยกเลิก
                </button>
                <button
                  className="button primary"
                  onClick={() => void confirmAttendance()}
                  disabled={busy}
                >
                  <Check size={16} />
                  ยืนยัน
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <ScanFace size={42} />
              <p>เมื่อพบใบหน้าที่ตรงกับระบบ ข้อมูลนักเรียนจะแสดงที่นี่</p>
            </div>
          )}
        </article>
      </section>
      <article className="panel scan-table">
        <div className="panel-head">
          <div>
            <h3>สถานะการเช็คชื่อแบบเรียลไทม์</h3>
            <span className="muted">อัปเดตอัตโนมัติทุก 3 วินาที</span>
          </div>
          <b>
            เช็คแล้ว {checked} / {session.totalStudents} คน
          </b>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>เวลา</th>
                <th>สถานะ</th>
                <th>ความมั่นใจ</th>
              </tr>
            </thead>
            <tbody>
              {session.attendance.length ? (
                session.attendance.map((item) => (
                  <tr key={item.id}>
                    <td>{item.student.studentCode}</td>
                    <td>
                      <b>{item.student.fullName}</b>
                    </td>
                    <td>{time(item.checkInTime)}</td>
                    <td>
                      <span className={`status ${item.status}`}>
                        {labels[item.status]}
                      </span>
                    </td>
                    <td>
                      {item.confidence === null
                        ? "-"
                        : `${Number(item.confidence).toFixed(1)}%`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      ยังไม่มีนักเรียนเช็คชื่อในรอบนี้
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
