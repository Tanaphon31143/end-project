"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeVideoFrame,
  analyzeVideoObservation,
  getFaceEngine,
  matchesEnrollmentPose,
} from "@/lib/face-recognition";
import { useStudentToast } from "./StudentToast";
import {
  attachCameraPreview,
  listVideoCameras,
  waitForVisibleCameraFrame,
} from "@/lib/video-preview.mjs";

type Pose = "FRONT" | "LEFT" | "RIGHT" | "UP" | "DOWN";
type Challenge = "BLINK" | "TURN_LEFT" | "TURN_RIGHT" | "LOOK_UP";
type Sample = Awaited<ReturnType<typeof analyzeVideoFrame>> & {
  poseType: Pose;
};
const poses: { type: Pose; label: string }[] = [
  { type: "FRONT", label: "หน้าตรง" },
  { type: "LEFT", label: "หันซ้าย" },
  { type: "RIGHT", label: "หันขวา" },
  { type: "UP", label: "เงยหน้า" },
  { type: "DOWN", label: "ก้มหน้า" },
];
const challengeLabels: Record<Challenge, string> = {
  BLINK: "กะพริบตา",
  TURN_LEFT: "หันหน้าไปทางซ้าย",
  TURN_RIGHT: "หันหน้าไปทางขวา",
  LOOK_UP: "เงยหน้าขึ้น",
};
const gestures: Record<Challenge, string[]> = {
  BLINK: ["blink left eye", "blink right eye"],
  TURN_LEFT: ["facing left"],
  TURN_RIGHT: ["facing right"],
  LOOK_UP: ["head up"],
};

export default function SelfFaceEnrollment({
  verified,
  hasFace,
  resume,
  studentName,
  studentCode,
  email,
}: {
  verified: boolean;
  hasFace: boolean;
  resume: boolean;
  studentName: string;
  studentCode: string;
  email: string;
}) {
  const router = useRouter(),
    notify = useStudentToast();
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null);
  const operationRef = useRef(false);
  const [open, setOpen] = useState(false),
    [camera, setCamera] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [challenge, setChallenge] = useState<Challenge | null>(null);
  const [cameras, setCameras] = useState<{ deviceId: string; label: string }[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [mirror, setMirror] = useState(true);
  const [consent, setConsent] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [success, setSuccess] = useState(false);
  const [enrollmentRequested, setEnrollmentRequested] = useState(
    !hasFace || resume,
  );
  const [faceDetected, setFaceDetected] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>(
    [],
  );
  const [samples, setSamples] = useState<Sample[]>([]);
  const identityReady = verified && (!hasFace || resume);
  const canVerifyGoogle = consent && !busy;
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function startCamera(deviceId = selectedDeviceId) {
    if (operationRef.current) return;
    operationRef.current = true;
    stopCamera();
    setSamples([]);
    setLivenessPassed(false);
    setFaceDetected(false);
    setCompletedChallenges([]);
    setOpen(true);
    setBusy(true);
    setReady(false);
    setCamera(false);
    setMessage("กำลังเชื่อมต่อกล้อง...");
    let lastError: unknown;
    const connect = async (video: MediaTrackConstraints | boolean) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: false,
      });
      streamRef.current = stream;
      try {
        await attachCameraPreview(videoRef.current, stream);
        await waitForVisibleCameraFrame(videoRef.current, () =>
          document.createElement("canvas"),
        );
        return stream;
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        streamRef.current = null;
        throw error;
      }
    };
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "อุปกรณ์นี้ต้องเปิดเว็บผ่าน HTTPS หรือ localhost จึงจะใช้กล้องได้",
        );
      }
      let stream: MediaStream | null = null;
      const firstChoice: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: "user" },
            width: { ideal: 960 },
            height: { ideal: 720 },
          };
      try {
        stream = await connect(firstChoice);
      } catch (error) {
        lastError = error;
        if (
          error instanceof DOMException &&
          (error.name === "NotAllowedError" || error.name === "SecurityError")
        )
          throw error;
      }
      if (!stream && !deviceId) {
        const available = await listVideoCameras(navigator.mediaDevices).catch(
          () => [],
        );
        setCameras(available);
        for (const device of available) {
          try {
            stream = await connect({ deviceId: { exact: device.deviceId } });
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!stream) {
          try {
            stream = await connect(true);
          } catch (error) {
            lastError = error;
          }
        }
      }
      if (!stream) {
        setCameras(
          await listVideoCameras(navigator.mediaDevices).catch(() => []),
        );
        throw lastError || new Error("ไม่พบกล้องที่ใช้งานได้");
      }
      const activeTrack = stream.getVideoTracks()[0];
      const activeDeviceId = activeTrack.getSettings().deviceId || deviceId;
      setSelectedDeviceId(activeDeviceId || "");
      setMirror(activeTrack.getSettings().facingMode !== "environment");
      setCameras(
        await listVideoCameras(navigator.mediaDevices).catch(() => []),
      );
      setCamera(true);
      setMessage("กล้องพร้อมแล้ว กำลังโหลดโมเดลตรวจใบหน้า...");
      await getFaceEngine();
      setReady(true);
      setMessage("กล้องพร้อมแล้ว กรุณาทำตามคำสั่งตรวจบุคคลจริงก่อนถ่ายภาพ");
    } catch (error) {
      stopCamera();
      const cameraMessage =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "โปรดอนุญาตให้เว็บไซต์ใช้กล้องในเบราว์เซอร์ แล้วลองอีกครั้ง"
          : error instanceof DOMException && error.name === "NotReadableError"
            ? "กล้องอาจถูกแอปอื่นใช้งานอยู่ กรุณาปิดแอปนั้นหรือเลือกกล้องอื่น"
            : error instanceof Error
              ? error.message
              : "เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบสิทธิ์กล้อง";
      setMessage(cameraMessage);
    } finally {
      operationRef.current = false;
      setBusy(false);
    }
  }
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera(false);
    setReady(false);
  }
  async function capture() {
    if (
      !livenessPassed ||
      !camera ||
      !ready ||
      !videoRef.current ||
      videoRef.current.videoWidth === 0 ||
      samples.length >= poses.length ||
      operationRef.current
    )
      return;
    operationRef.current = true;
    setBusy(true);
    setMessage("กำลังตรวจความชัดและบุคคลจริง...");
    try {
      const sample = await analyzeVideoFrame(videoRef.current);
      const poseType = poses[samples.length].type;
      if (!matchesEnrollmentPose(poseType, sample.gestures))
        throw new Error(
          `มุมใบหน้ายังไม่ตรงกับ “${poses[samples.length].label}” กรุณาปรับท่าแล้วถ่ายใหม่`,
        );
      setSamples((current) => [...current, { ...sample, poseType }]);
      setMessage(
        samples.length === poses.length - 1
          ? "ภาพครบแล้ว กำลังรอบันทึกข้อมูลใบหน้า"
          : `ถ่ายภาพ${poses[samples.length].label}แล้ว กรุณาถ่าย${poses[samples.length + 1].label}ต่อ`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ถ่ายภาพไม่สำเร็จ");
    } finally {
      operationRef.current = false;
      setBusy(false);
    }
  }
  async function completeChallenge(video: HTMLVideoElement, kind: Challenge) {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      try {
        const item = await analyzeVideoObservation(video);
        setFaceDetected(true);
        if (
          item.real >= 0.65 &&
          item.live >= 0.55 &&
          item.gestures.some((gesture) => gestures[kind].includes(gesture))
        )
          return {
            challenge: kind,
            gestures: item.gestures,
            real: item.real,
            live: item.live,
            capturedAt: Date.now(),
          };
      } catch {
        /* retry until the ten-second deadline */
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(
      `ไม่พบการ${challengeLabels[kind]}ภายใน 10 วินาที กรุณาลองใหม่`,
    );
  }
  async function verifyGoogle() {
    if (!consent || operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    setMessage("กำลังเริ่มยืนยันบัญชี Google...");
    try {
      const response = await fetch("/api/student/face-identity/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      const result = (await response.json().catch(() => null)) as {
        redirectUrl?: string;
        message?: string;
      } | null;
      if (!response.ok || !result?.redirectUrl)
        throw new Error(
          result?.message || "เริ่มยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่",
        );
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "เชื่อมต่อระบบยืนยันบัญชีไม่สำเร็จ",
      );
      operationRef.current = false;
      setBusy(false);
    }
  }
  async function verifyLiveness() {
    if (!camera || !ready || !videoRef.current || operationRef.current) return;
    operationRef.current = true;
    setBusy(true);
    setMessage("กำลังออกคำสั่งตรวจบุคคลจริง...");
    try {
      const issued = await fetch("/api/student/face-enrollment/challenge", {
        method: "POST",
      });
      const data = (await issued.json()) as {
        token?: string;
        challenges?: Challenge[];
        message?: string;
      };
      if (!issued.ok || !data.token || data.challenges?.length !== 3)
        throw new Error(data.message || "เริ่มตรวจบุคคลจริงไม่สำเร็จ");
      const evidence = [];
      setFaceDetected(false);
      setCompletedChallenges([]);
      for (const kind of data.challenges) {
        setChallenge(kind);
        setMessage(`กรุณา${challengeLabels[kind]}ภายใน 10 วินาที`);
        evidence.push(await completeChallenge(videoRef.current, kind));
        setCompletedChallenges((current) => [...current, kind]);
      }
      const response = await fetch("/api/student/face-enrollment/liveness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token, evidence }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "ไม่ผ่านการตรวจบุคคลจริง");
      setLivenessPassed(true);
      setMessage("ตรวจบุคคลจริงผ่านแล้ว กรุณาถ่ายภาพใบหน้า 5 มุม");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ไม่ผ่านการตรวจบุคคลจริง",
      );
    } finally {
      operationRef.current = false;
      setChallenge(null);
      setBusy(false);
    }
  }
  async function enroll() {
    if (
      !livenessPassed ||
      !camera ||
      !ready ||
      samples.length !== poses.length ||
      operationRef.current
    )
      return;
    operationRef.current = true;
    setBusy(true);
    setMessage("กำลังบันทึกข้อมูลใบหน้าของคุณ...");
    try {
      const form = new FormData();
      form.set(
        "embeddings",
        JSON.stringify(samples.map((sample) => sample.embedding)),
      );
      form.set(
        "qualities",
        JSON.stringify(samples.map((sample) => sample.quality)),
      );
      form.set(
        "poseTypes",
        JSON.stringify(samples.map((sample) => sample.poseType)),
      );
      form.set(
        "cameraType",
        streamRef.current?.getVideoTracks()[0]?.label || "",
      );
      samples.forEach((sample, index) =>
        form.append("images", sample.blob, `face-${index + 1}.jpg`),
      );
      const response = await fetch("/api/student/face-enrollment", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message || "บันทึกข้อมูลใบหน้าไม่สำเร็จ");
      notify(result.message || "ลงทะเบียนใบหน้าสำเร็จ");
      setSuccess(true);
      stopCamera();
      setOpen(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ยืนยันใบหน้าไม่สำเร็จ",
      );
    } finally {
      operationRef.current = false;
      setChallenge(null);
      setBusy(false);
    }
  }
  return (
    <section className="card card-pad self-face-enrollment">
      <h2>
        {hasFace ? "ลงทะเบียนใบหน้าใหม่" : "ยืนยันตัวตนและลงทะเบียนใบหน้า"}
      </h2>
      {!enrollmentRequested && hasFace && (
        <>
          <p>
            ✓ ยืนยันตัวตนแล้ว · ✓ ลงทะเบียนใบหน้าแล้ว · ✓ พร้อมสำหรับการเช็คชื่อ
          </p>
          <button
            type="button"
            className="button primary"
            onClick={() => setEnrollmentRequested(true)}
          >
            ลงทะเบียนใบหน้าใหม่
          </button>
        </>
      )}
      {enrollmentRequested && (
        <>
          <p>
            ยืนยันบัญชีและตรวจบุคคลจริงก่อนถ่ายภาพ 5 มุม
            ระบบจะผูกข้อมูลกับบัญชีนักเรียนที่เข้าสู่ระบบเท่านั้น
          </p>
          <p>
            รองรับกล้องคอมพิวเตอร์ โน้ตบุ๊ก และมือถือ
            โดยมือถือจะต้องเปิดเว็บผ่าน HTTPS และอนุญาตการใช้กล้อง
          </p>
          <ol className="self-face-wizard" aria-label="ขั้นตอนลงทะเบียนใบหน้า">
            <li className={identityReady ? "done" : "current"}>
              1 ยืนยันบัญชี
            </li>
            <li className={identityReady ? "done" : ""}>2 ตรวจสอบข้อมูล</li>
            <li
              className={
                livenessPassed ? "done" : identityReady ? "current" : ""
              }
            >
              3 ตรวจบุคคลจริง
            </li>
            <li className={success ? "done" : livenessPassed ? "current" : ""}>
              4 ถ่ายภาพ 5 มุม
            </li>
            <li className={success ? "done" : ""}>5 สำเร็จ</li>
          </ol>
          <div className="self-face-account">
            <strong>{studentName}</strong>
            <span>รหัสนักเรียน {studentCode}</span>
            <span>อีเมลบัญชีนักเรียน: {email}</span>
            <small>
              {identityReady
                ? "✓ Google อีเมลตรงกับบัญชีนักเรียน และตรวจสอบข้อมูลนักเรียนแล้ว"
                : "เลือกบัญชี Google ที่ใช้อีเมลตรงกับบัญชีนักเรียนนี้และยังไม่ผูกกับใบหน้าบัญชีอื่น"}
            </small>
          </div>
          {!identityReady && !success && (
            <>
              <label className="self-face-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                <span>
                  ฉันยินยอมให้ระบบใช้กล้องและประมวลผลข้อมูลใบหน้าสำหรับการเช็คชื่อ
                </span>
              </label>
              {!consent && (
                <small id="face-consent-hint">
                  กรุณาติ๊กยินยอมก่อน เพื่อเปิดปุ่มยืนยันบัญชี Google
                </small>
              )}
              <button
                type="button"
                className="button primary"
                disabled={!canVerifyGoogle}
                aria-describedby={!consent ? "face-consent-hint" : undefined}
                onClick={() => void verifyGoogle()}
              >
                {busy
                  ? "กำลังยืนยันบัญชี..."
                  : "ยืนยันบัญชี Google และดำเนินการต่อ"}
              </button>
            </>
          )}
          {identityReady && !open && !success && (
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={() => void startCamera()}
            >
              {busy ? "กำลังเปิดกล้อง..." : "เปิดกล้องและตรวจบุคคลจริง"}
            </button>
          )}
          {success && (
            <div role="status">
              <p>
                ✓ ยืนยันตัวตนสำเร็จ · ✓ ตรวจสอบบุคคลจริงสำเร็จ · ✓
                ลงทะเบียนใบหน้าสำเร็จ · ✓ พร้อมใช้สำหรับการเช็คชื่อ
              </p>
              <p>
                ชื่อ: {studentName} · รหัสนักเรียน: {studentCode} · Email:{" "}
                {email} · วิธียืนยัน: Google · Liveness: ผ่าน · จำนวนภาพ: 5 ·
                สถานะ: พร้อมใช้งาน
              </p>
            </div>
          )}
          {open && cameras.length > 0 && (
            <label className="self-face-camera-select">
              เลือกกล้อง
              <select
                value={
                  cameras.some((item) => item.deviceId === selectedDeviceId)
                    ? selectedDeviceId
                    : ""
                }
                disabled={busy}
                onChange={(event) => void startCamera(event.target.value)}
              >
                {!cameras.some(
                  (item) => item.deviceId === selectedDeviceId,
                ) && <option value="">กล้องที่ใช้อยู่</option>}
                {cameras.map((item) => (
                  <option key={item.deviceId} value={item.deviceId}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="ภาพจากกล้องสำหรับลงทะเบียนใบหน้า"
            className="self-face-video"
            style={{
              display: open ? "block" : "none",
              transform: mirror ? "scaleX(-1)" : "none",
            }}
          />
          {open && (
            <>
              {faceDetected && (
                <p role="status">
                  ตรวจพบใบหน้า ✓
                  {completedChallenges.length > 0
                    ? ` · ${completedChallenges.map((item) => `${challengeLabels[item]} ✓`).join(" · ")}`
                    : ""}
                </p>
              )}
              <div className="self-face-steps" aria-label="มุมภาพที่ต้องถ่าย">
                {poses.map((pose, index) => (
                  <div key={pose.type} className={samples[index] ? "done" : ""}>
                    {samples[index] ? (
                      <Image
                        src={samples[index].preview}
                        alt={`ภาพ${pose.label}ที่ถ่ายแล้ว`}
                        width={100}
                        height={100}
                        unoptimized
                      />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                    <strong>{pose.label}</strong>
                    <small>
                      {samples[index]
                        ? "✓ เสร็จ"
                        : livenessPassed && index === samples.length
                          ? "กำลังถ่าย"
                          : "รอดำเนินการ"}
                    </small>
                  </div>
                ))}
              </div>
              {message && (
                <p role="status" aria-live={challenge ? "assertive" : "polite"}>
                  {message}
                </p>
              )}
              <div className="self-face-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    stopCamera();
                    setOpen(false);
                    setSamples([]);
                  }}
                >
                  ยกเลิก
                </button>
                {!ready && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void startCamera()}
                  >
                    เปิดกล้องใหม่
                  </button>
                )}
                {camera && !livenessPassed && (
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy || !ready}
                    onClick={() => void verifyLiveness()}
                  >
                    {busy ? "กำลังตรวจสอบ..." : "เริ่มตรวจบุคคลจริง"}
                  </button>
                )}
                {camera && livenessPassed && samples.length > 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      setSamples((current) => current.slice(0, -1))
                    }
                  >
                    ถ่ายมุมล่าสุดใหม่
                  </button>
                )}
                {camera && livenessPassed && samples.length < poses.length && (
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy || !ready}
                    onClick={() => void capture()}
                  >
                    ถ่ายภาพ{poses[samples.length].label}
                  </button>
                )}
                {camera &&
                  livenessPassed &&
                  samples.length === poses.length && (
                    <button
                      type="button"
                      className="button primary"
                      disabled={busy || !ready}
                      onClick={() => void enroll()}
                    >
                      {busy ? "กำลังบันทึก..." : "บันทึกข้อมูลใบหน้า"}
                    </button>
                  )}
              </div>
            </>
          )}
          {!open && message && !success && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
