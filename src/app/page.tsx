"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { RippleButton } from "@/components/portal/RippleButton";

type Status =
  | "idle"
  | "error"
  | "loading"
  | "authenticated"
  | "google"
  | "forgot";

const sampleNews = [
  {
    number: "01",
    type: "Face Recognition",
    title: "สแกนใบหน้าเพื่อเช็คชื่อ",
    summary: "ตรวจจับและยืนยันตัวตนนักเรียนก่อนบันทึกเวลาเข้าเรียน",
  },
  {
    number: "02",
    type: "Attendance",
    title: "บันทึกการเข้าเรียนอัตโนมัติ",
    summary: "จัดเก็บวัน เวลา วิชา ห้องเรียน และสถานะการเข้าเรียน",
  },
  {
    number: "03",
    type: "Reports",
    title: "ตรวจสอบและสรุปผลการเข้าเรียน",
    summary: "ดูประวัติการเข้าเรียน สถิติการมาเรียน และส่งออกรายงาน",
  },
];

function GoogleMark() {
  return (
    <svg aria-hidden="true" className={styles.googleMark} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.73-.07-1.43-.2-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.27Z"
      />
      <path
        fill="#34A853"
        d="M12 21.6c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.6Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.68a5.85 5.85 0 0 1 0-3.36V7.79H3.3a9.73 9.73 0 0 0 0 8.42l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.29c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.83 3.39 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z"
      />
    </svg>
  );
}

export default function Home() {
  const pageRef = useRef<HTMLElement>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState({ email: "", password: "" });

  useEffect(() => {
    let frame = 0;
    let nextX = window.innerWidth / 2;
    let nextY = window.innerHeight / 2;

    function paintPointer() {
      frame = 0;
      pageRef.current?.style.setProperty("--pointer-x", `${nextX}px`);
      pageRef.current?.style.setProperty("--pointer-y", `${nextY}px`);
    }

    function handlePointerMove(event: PointerEvent) {
      nextX = event.clientX;
      nextY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paintPointer);
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    paintPointer();

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors = {
      email: !email
        ? "กรุณากรอกอีเมล"
        : !email.includes("@")
          ? "กรุณาตรวจสอบรูปแบบอีเมล"
          : "",
      password: !password ? "กรุณากรอกรหัสผ่าน" : "",
    };

    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus("error");
        setErrors({
          email: "",
          password: result.message ?? "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        });
        return;
      }
      window.location.href = result.redirectTo;
    } catch {
      setStatus("error");
      setErrors({
        email: "",
        password: "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam === "google_account_inactive") {
      return "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
    }
    if (errorParam === "google_email_unverified") {
      return "บัญชี Google ต้องมีอีเมลที่ยืนยันแล้ว";
    }
    if (errorParam === "google_link_required") {
      return "บัญชีผู้ดูแลหรือครูต้องเชื่อม Google จากบัญชีเดิมก่อน";
    }
    if (errorParam === "google_access_denied") {
      return "การยืนยันตัวตนด้วย Google ถูกยกเลิก";
    }
    if (
      errorParam === "google_state_mismatch" ||
      errorParam === "google_auth_failed" ||
      errorParam === "google_config_error"
    ) {
      return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google กรุณาลองใหม่อีกครั้ง";
    }
    return "";
  });

  const effectiveStatus =
    authErrorMessage && status === "idle" ? "error" : status;

  function handleGoogleLogin() {
    setAuthErrorMessage("");
    setErrors({ email: "", password: "" });
    setGoogleLoading(true);
    setStatus("loading");
    window.location.assign("/api/auth/google");
  }

  function announceAction(
    nextStatus: Exclude<Status, "idle" | "error" | "loading" | "authenticated">,
  ) {
    setErrors({ email: "", password: "" });
    setAuthErrorMessage("");
    setStatus(nextStatus);
  }

  return (
    <main className={styles.page} ref={pageRef}>
      <div
        className={`${styles.pointerOrb} ${styles.pointerOrbBack}`}
        aria-hidden="true"
      />
      <div
        className={`${styles.pointerOrb} ${styles.pointerOrbFront}`}
        aria-hidden="true"
      />
      <section className={styles.newsPanel} aria-labelledby="news-title">
        <div className={styles.newsInner}>
          <div className={styles.brandBlock}>
            <div className={styles.brandMark}>
              <Image
                className={styles.brandLogo}
                src="/school-logo.jpg"
                alt="ตราสัญลักษณ์โรงเรียน"
                width={800}
                height={445}
                priority
              />
            </div>
            <div>
              <p className={styles.brandName}>School OS</p>
              <p className={styles.brandCaption}>ศูนย์บัญชาการโรงเรียน</p>
            </div>
          </div>

          <div className={styles.newsMain}>
            <div className={styles.newsIntro}>
              <p className={styles.sectionLabel}>Face Attendance</p>
              <h1 id="news-title">
                เช็คชื่อง่าย
                <br />
                <span className={styles.faceAttendanceTitle}>ด้วยการสแกนใบหน้า</span>
              </h1>
              <p>
                ระบบบันทึกเวลาเข้าเรียนด้วยเทคโนโลยีจดจำใบหน้า
                <br />
                <span className={styles.faceAttendanceDescription}>ช่วยให้การเช็คชื่อรวดเร็ว แม่นยำ และตรวจสอบข้อมูลได้สะดวก</span>
              </p>
            </div>

            <div className={styles.newsList} aria-label="ความสามารถของระบบเช็คชื่อ">
              {sampleNews.map((item) => (
                <article className={styles.newsItem} key={item.number}>
                  <span className={styles.newsNumber}>{item.number}</span>
                  <div>
                    <p className={styles.newsType}>{item.type}</p>
                    <h2>{item.title}</h2>
                    <p>{item.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <p className={styles.sampleNote}>
            Sample content · พร้อมเชื่อมต่อข้อมูลจริง
          </p>
        </div>
      </section>

      <section className={styles.loginPanel} aria-labelledby="login-title">
        <div className={styles.loginCard}>
          <div className={styles.intro}>
            <h2 id="login-title">เข้าสู่ระบบ</h2>
            <p>จัดการข้อมูลโรงเรียนของคุณได้จากที่เดียว</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="email">อีเมล</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="name@school.ac.th"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p className={styles.fieldError} id="email-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password">รหัสผ่าน</label>
              <div className={styles.passwordField}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  data-cursor-target
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? "ซ่อน" : "แสดง"}
                </button>
              </div>
              {errors.password && (
                <p
                  className={styles.fieldError}
                  id="password-error"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            <div className={styles.accountOptions}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span className={styles.customCheckbox} aria-hidden="true" />
                <span>จำการเข้าสู่ระบบ</span>
              </label>
              <button
                data-cursor-target
                type="button"
                className={styles.forgotLink}
                onClick={() => announceAction("forgot")}
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            <RippleButton
              data-cursor-target
              className={styles.primaryButton}
              type="submit"
              disabled={status === "loading"}
              aria-busy={status === "loading"}
            >
              {status === "loading" && !googleLoading
                ? "กำลังตรวจสอบ…"
                : "เข้าสู่ระบบ"}
            </RippleButton>
            {status !== "idle" && (
              <p
                className={`${styles.notice} ${status === "error" ? styles.noticeError : ""}`}
                role="status"
                aria-live="polite"
              >
                {status === "error" &&
                  (authErrorMessage ||
                    "กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง")}
                {status === "loading" &&
                  (googleLoading
                    ? "กำลังเชื่อมต่อไปยัง Google…"
                    : "กำลังเตรียมการเชื่อมต่อระบบ")}
                {status === "authenticated" &&
                  "เข้าสู่ระบบสำเร็จ · เชื่อมต่อข้อมูลโรงเรียนแล้ว"}
                {status === "forgot" &&
                  "การกู้คืนรหัสผ่านจะเชื่อมต่อในขั้นตอนถัดไป"}
                {status === "google" && "กำลังเชื่อมต่อระบบ Google Login…"}
              </p>
            )}
          </form>

          <div className={styles.divider}>
            <span>หรือ</span>
          </div>

          <button
            data-cursor-target
            className={styles.googleButton}
            type="button"
            onClick={handleGoogleLogin}
            disabled={status === "loading"}
          >
            <GoogleMark />
            <span>
              {googleLoading ? "กำลังเปิด Google…" : "เข้าสู่ระบบด้วย Google"}
            </span>
          </button>

          <p className={styles.supportText}>
            ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบโรงเรียน
          </p>
        </div>
        <p className={styles.footerNote}>ระบบจัดการข้อมูลภายในโรงเรียน</p>
      </section>
    </main>
  );
}
