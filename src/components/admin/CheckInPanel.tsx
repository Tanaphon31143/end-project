"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CircleCheck,
  Clock3,
  LoaderCircle,
  Play,
  ScanFace,
  Square,
} from "lucide-react";
import { analyzeVideoFrame, getFaceEngine } from "@/lib/face-recognition";
import type {
  CheckInClassroom,
  CheckInRecord,
  CheckInSession,
  CheckInSubject,
} from "./check-in/types";

type PageData = {
  classrooms: CheckInClassroom[];
  subjects: CheckInSubject[];
  sessions: CheckInSession[];
};
type ScanResult = {
  matched: boolean;
  alreadyCheckedIn?: boolean;
  similarity: number;
  message?: string;
  student?: { id: number; code: string; name: string; className: string };
  record?: {
    id: number;
    checkInTime: string;
    status: "มาเรียน" | "สาย";
    confidence: number;
  };
};
export function CheckInPanel({
  initialData,
  initialDate,
}: {
  initialData: PageData;
  initialDate: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null);
  const [data, setData] = useState(initialData),
    [date, setDate] = useState(initialDate),
    [classroomId, setClassroomId] = useState<number | null>(null),
    [subjectId, setSubjectId] = useState<number | null>(null),
    [startTime, setStartTime] = useState("08:00"),
    [endTime, setEndTime] = useState("09:00"),
    [lateMinutes, setLateMinutes] = useState("15"),
    [sessionId, setSessionId] = useState<number | null>(null),
    [records, setRecords] = useState<CheckInRecord[]>([]),
    [camera, setCamera] = useState(false),
    [starting, setStarting] = useState(false),
    [scanning, setScanning] = useState(false),
    [message, setMessage] = useState("เลือกรอบเช็คชื่อก่อนเปิดกล้อง"),
    [result, setResult] = useState<ScanResult | null>(null),
    [busy, setBusy] = useState(false);
  const selectedSession =
      data.sessions.find((item) => item.id === sessionId) || null,
    subjects = useMemo(
      () =>
        data.subjects.filter(
          (item) => !classroomId || item.classroomId === classroomId,
        ),
      [data.subjects, classroomId],
    );
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
    setStarting(false);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);
  async function loadData(nextDate = date, selectId?: number) {
    const response = await fetch(`/api/check-in-sessions?date=${nextDate}`, {
        cache: "no-store",
      }),
      next = (await response.json()) as PageData & { message?: string };
    if (!response.ok)
      throw new Error(next.message || "โหลดรอบเช็คชื่อไม่สำเร็จ");
    setData(next);
    if (selectId) setSessionId(selectId);
  }
  async function loadRecords(id: number | null) {
    if (!id) return;
    const response = await fetch(`/api/check-in?sessionId=${id}`, {
        cache: "no-store",
      }),
      next = (await response.json()) as {
        records?: CheckInRecord[];
        message?: string;
      };
    if (!response.ok)
      throw new Error(next.message || "โหลดรายการเช็คชื่อไม่สำเร็จ");
    setRecords(next.records || []);
  }
  async function selectSession(id: number | null) {
    stopCamera();
    setResult(null);
    setRecords([]);
    setSessionId(id);
    if (!id) return;
    try {
      await loadRecords(id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ",
      );
    }
  }
  function chooseSubject(id: number) {
    setSubjectId(id || null);
    const subject = data.subjects.find((item) => item.id === id);
    if (subject) {
      setClassroomId(subject.classroomId);
      setStartTime(subject.startTime);
      setEndTime(subject.endTime);
    }
  }
  async function createSession() {
    if (!classroomId || !subjectId) {
      setMessage("กรุณาเลือกห้องเรียนและรายวิชา");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/check-in-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classroomId,
            subjectId,
            sessionDate: date,
            startTime,
            endTime,
            lateMinutes: Number(lateMinutes),
          }),
        }),
        next = (await response.json()) as { id?: number; message?: string };
      if (!response.ok)
        throw new Error(next.message || "เปิดรอบเช็คชื่อไม่สำเร็จ");
      await loadData(date, next.id);
      setRecords([]);
      setMessage(next.message || "เปิดรอบเช็คชื่อสำเร็จ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  async function changeSessionStatus(status: "ACTIVE" | "CLOSED") {
    if (!selectedSession) return;
    setBusy(true);
    try {
      const response = await fetch("/api/check-in-sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selectedSession.id, status }),
        }),
        next = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(next.message || "เปลี่ยนสถานะไม่สำเร็จ");
      if (status === "CLOSED") stopCamera();
      await loadData();
      setMessage(next.message || "อัปเดตรอบเช็คชื่อแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  async function startCamera() {
    if (!selectedSession || selectedSession.status !== "ACTIVE") {
      setMessage("กรุณาเลือกรอบที่เปิดใช้งาน");
      return;
    }
    setStarting(true);
    setMessage("กำลังเตรียมโมเดลและกล้อง...");
    try {
      await getFaceEngine();
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
      setMessage("พร้อมสแกน จัดใบหน้าให้อยู่กึ่งกลางกรอบ");
    } catch {
      stopCamera();
      setMessage("เปิดกล้องหรือโหลดโมเดลไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้อง");
    } finally {
      setStarting(false);
    }
  }
  async function scan() {
    if (!videoRef.current || !selectedSession) return;
    setScanning(true);
    setResult(null);
    setMessage("กำลังตรวจจับและเปรียบเทียบใบหน้า...");
    try {
      const sample = await analyzeVideoFrame(videoRef.current),
        response = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: selectedSession.id,
            embedding: sample.embedding,
          }),
        }),
        next = (await response.json()) as ScanResult;
      if (!response.ok && response.status !== 422)
        throw new Error(next.message || "เช็คชื่อไม่สำเร็จ");
      setResult(next);
      setMessage(
        next.matched
          ? next.alreadyCheckedIn
            ? "นักเรียนคนนี้เช็คชื่อแล้ว"
            : "บันทึกการเช็คชื่อสำเร็จ"
          : next.message || "ไม่พบใบหน้าที่ตรงกัน",
      );
      if (next.matched)
        await Promise.all([loadRecords(selectedSession.id), loadData()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setScanning(false);
    }
  }
  return (
    <>
      <section className="dashboard-card checkin-setup">
        <div className="card-head">
          <div>
            <h2>ตั้งค่ารอบเช็คชื่อ</h2>
            <p>เลือกห้อง วิชา และช่วงเวลาก่อนเริ่มสแกน</p>
          </div>
          {selectedSession && (
            <span
              className={`data-badge ${selectedSession.status === "ACTIVE" ? "green" : "gray"}`}
            >
              {selectedSession.status === "ACTIVE" ? "กำลังเปิด" : "ปิดแล้ว"}
            </span>
          )}
        </div>
        <div className="checkin-form">
          <label>
            วันที่
            <input
              type="date"
              value={date}
              onChange={(event) => {
                const next = event.target.value;
                setDate(next);
                setSessionId(null);
                setRecords([]);
                void loadData(next);
              }}
            />
          </label>
          <label>
            ห้องเรียน
            <select
              value={classroomId || ""}
              onChange={(event) => {
                setClassroomId(Number(event.target.value) || null);
                setSubjectId(null);
              }}
            >
              <option value="">เลือกห้องเรียน</option>
              {data.classrooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            รายวิชา
            <select
              value={subjectId || ""}
              onChange={(event) => chooseSubject(Number(event.target.value))}
            >
              <option value="">เลือกรายวิชา</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            เริ่ม
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>
          <label>
            สิ้นสุด
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
          <label>
            สายหลัง (นาที)
            <input
              type="number"
              min="0"
              max="120"
              value={lateMinutes}
              onChange={(event) => setLateMinutes(event.target.value)}
            />
          </label>
          <button
            className="admin-button primary"
            onClick={createSession}
            disabled={busy}
          >
            <Play size={17} />
            เปิดรอบใหม่
          </button>
        </div>
        <div className="session-picker">
          <label>
            รอบเรียน
            <select
              value={sessionId || ""}
              onChange={(event) =>
                void selectSession(Number(event.target.value) || null)
              }
            >
              <option value="">เลือกรอบเช็คชื่อ</option>
              {data.sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.startTime}–{item.endTime} · {item.subjectCode}{" "}
                  {item.subjectName} · {item.className} (
                  {item.status === "ACTIVE" ? "เปิด" : "ปิด"})
                </option>
              ))}
            </select>
          </label>
          {selectedSession && (
            <button
              className={`admin-button ${selectedSession.status === "ACTIVE" ? "danger-button" : "secondary"}`}
              disabled={busy}
              onClick={() =>
                changeSessionStatus(
                  selectedSession.status === "ACTIVE" ? "CLOSED" : "ACTIVE",
                )
              }
            >
              {selectedSession.status === "ACTIVE" ? (
                <Square size={16} />
              ) : (
                <Play size={16} />
              )}{" "}
              {selectedSession.status === "ACTIVE"
                ? "ปิดรอบ"
                : "เปิดรอบอีกครั้ง"}
            </button>
          )}
        </div>
      </section>
      <div className="checkin-grid">
        <section className={`camera-panel ${camera ? "active" : ""}`}>
          <div className="camera-top">
            <span>
              <i />
              {starting
                ? "กำลังเปิดกล้อง"
                : camera
                  ? "กล้องพร้อมสแกน"
                  : "กล้องหยุดทำงาน"}
            </span>
            <b>
              {selectedSession
                ? `${selectedSession.subjectCode} · ${selectedSession.className}`
                : "ยังไม่เลือกรอบ"}
            </b>
          </div>
          <div className="face-frame">
            <video
              ref={videoRef}
              className="camera-preview"
              autoPlay
              muted
              playsInline
            />
            <span />
            <span />
            <span />
            <span />
            <ScanFace size={54} />
            <p>{message}</p>
          </div>
          <div className="camera-actions">
            <button
              className="admin-button secondary"
              onClick={camera ? stopCamera : startCamera}
              disabled={starting || scanning}
            >
              {camera ? <CameraOff size={18} /> : <Camera size={18} />}{" "}
              {camera ? "หยุดกล้อง" : "เริ่มกล้อง"}
            </button>
            <button
              className="admin-button primary"
              onClick={scan}
              disabled={
                !camera || scanning || selectedSession?.status !== "ACTIVE"
              }
            >
              {scanning ? (
                <LoaderCircle className="face-spin" size={18} />
              ) : (
                <ScanFace size={18} />
              )}{" "}
              {scanning ? "กำลังตรวจจับ..." : "สแกนใบหน้า"}
            </button>
          </div>
        </section>
        <section className="dashboard-card detected-card">
          <div className="card-head">
            <div>
              <h2>ข้อมูลผู้ตรวจพบ</h2>
              <p>ผลการตรวจจับล่าสุด</p>
            </div>
            <span className="normal">
              <i />
              {camera ? "พร้อมใช้งาน" : "รอเปิดกล้อง"}
            </span>
          </div>
          <div className="detected-profile">
            <span>{result?.student?.name.slice(0, 2) || "--"}</span>
            <h3>{result?.student?.name || "ยังไม่พบข้อมูล"}</h3>
            <p>
              {result?.student
                ? `${result.student.code} · ${result.student.className}`
                : message}
            </p>
          </div>
          <dl>
            <div>
              <dt>ชั้นเรียน</dt>
              <dd>{result?.student?.className || "-"}</dd>
            </div>
            <div>
              <dt>เวลาที่ตรวจพบ</dt>
              <dd>{result?.record?.checkInTime || "-"}</dd>
            </div>
            <div>
              <dt>ความมั่นใจ</dt>
              <dd>
                {result ? `${(result.similarity * 100).toFixed(0)}%` : "-"}
              </dd>
            </div>
            <div>
              <dt>สถานะ</dt>
              <dd>
                <span
                  className={`data-badge ${result?.record?.status === "สาย" ? "orange" : result?.matched ? "green" : "gray"}`}
                >
                  {result?.record?.status ||
                    (result?.matched ? "พบข้อมูล" : "รอตรวจจับ")}
                </span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="dashboard-card checkin-recent">
        <div className="card-head">
          <div>
            <h2>รายการเช็คชื่อในรอบนี้</h2>
            <p>
              {selectedSession
                ? `${selectedSession.subjectName} · ${selectedSession.className}`
                : "กรุณาเลือกรอบเช็คชื่อ"}
            </p>
          </div>
          <span className="row-count">{records.length} คน</span>
        </div>
        <div className="admin-data-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ-สกุล</th>
                <th>ห้อง</th>
                <th>เวลา</th>
                <th>ความมั่นใจ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.studentCode}</td>
                  <td>{record.studentName}</td>
                  <td>{record.className}</td>
                  <td>
                    <Clock3 size={14} /> {record.checkInTime}
                  </td>
                  <td>{Number(record.confidence).toFixed(2)}%</td>
                  <td>
                    <span
                      className={`data-badge ${record.status === "สาย" ? "orange" : "green"}`}
                    >
                      <CircleCheck size={13} />
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!records.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="subject-empty">
                      <span>ยังไม่มีรายการเช็คชื่อ</span>
                      <p>รายการจะปรากฏหลังสแกนใบหน้าสำเร็จ</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
