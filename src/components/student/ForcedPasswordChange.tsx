"use client";

import { useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import styles from "./ForcedPasswordChange.module.css";

// Shown by the student layout in place of every page while the account still
// uses the password issued by the Excel import.
export default function ForcedPasswordChange({ name }: { name: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const pointerButtonRef = useRef<HTMLButtonElement | null>(null);

  function clearWelcomePointer(event: PointerEvent<HTMLElement>) {
    delete event.currentTarget.dataset.pointerDot;
  }

  function updateWelcomePointer(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") {
      clearWelcomePointer(event);
      return;
    }
    const panel = event.currentTarget;
    const bounds = panel.getBoundingClientRect();
    panel.style.setProperty("--welcome-pointer-x", `${event.clientX - bounds.left}px`);
    panel.style.setProperty("--welcome-pointer-y", `${event.clientY - bounds.top}px`);
    panel.dataset.pointerDot = "true";
  }

  function clearButtonPointer() {
    if (pointerButtonRef.current) {
      delete pointerButtonRef.current.dataset.pointerRing;
      pointerButtonRef.current = null;
    }
  }

  function updateButtonPointer(event: PointerEvent<HTMLDivElement>) {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>("button")
      : null;
    if (
      event.pointerType !== "mouse" ||
      !button ||
      button.disabled ||
      !event.currentTarget.contains(button) ||
      !(button.matches(".account-profile-button.primary") || button.classList.contains(styles.logout))
    ) {
      clearButtonPointer();
      return;
    }
    if (pointerButtonRef.current !== button) clearButtonPointer();
    const bounds = button.getBoundingClientRect();
    button.style.setProperty("--pointer-x", `${event.clientX - bounds.left - button.clientLeft}px`);
    button.style.setProperty("--pointer-y", `${event.clientY - bounds.top - button.clientTop}px`);
    button.dataset.pointerRing = "true";
    pointerButtonRef.current = button;
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.push("/");
      router.refresh();
    } catch {
      setLogoutError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className={`account-profile ${styles.page}`} aria-labelledby="student-welcome-title">
      <div className={styles.panel}>
        <section
          className={styles.welcome}
          onPointerEnter={updateWelcomePointer}
          onPointerMove={updateWelcomePointer}
          onPointerLeave={clearWelcomePointer}
          onPointerCancel={clearWelcomePointer}
        >
          <div className={styles.brand}>
            <Image src="/school-icon.png" alt="" width={44} height={44} preload />
            <div>
              <strong>School OS</strong>
              <span>ระบบสำหรับนักเรียน</span>
            </div>
          </div>
          <div className={styles.welcomeCopy}>
            <h1 id="student-welcome-title" className={styles.greeting}>
              สวัสดี
              <span>{name}</span>
            </h1>
            <p>เริ่มต้นใช้งานระบบนักเรียน<br />ด้วยรหัสผ่านที่คุณตั้งเอง</p>
          </div>
          <div className={styles.securityNote}>
            <ShieldCheck size={24} aria-hidden="true" />
            <p>ดูแลความปลอดภัยของบัญชี<span>ด้วยรหัสผ่านที่คาดเดาได้ยาก</span></p>
          </div>
        </section>
        <div
          className={styles.formArea}
          onPointerOver={updateButtonPointer}
          onPointerMove={updateButtonPointer}
          onPointerLeave={clearButtonPointer}
        >
          <PasswordChangeCard role="student" forced />
          <div className={styles.footer}>
            {logoutError && <p role="alert">{logoutError}</p>}
            <button type="button" className={styles.logout} onClick={() => void logout()} disabled={loggingOut}>
              <LogOut size={16} aria-hidden="true" />
              {loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
