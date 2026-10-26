"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import styles from "@/app/page.module.css";
import { AuthBrand } from "@/components/AuthBrand";
export default function PasswordRecoveryForm({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [complete, setComplete] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    if (token && data.get("password") !== data.get("confirm")) { setError(true); setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(token ? "/api/auth/reset-password" : "/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(token ? { token, password: data.get("password") } : { email: data.get("email") }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message);
      setMessage(body.message); setComplete(true);
    } catch (e) { setError(true); setMessage(e instanceof Error ? e.message : "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }
  return <main className={styles.recoveryPage}><section className={styles.loginCard} aria-labelledby="recovery-title"><AuthBrand compact /><div className={styles.intro}><h1 id="recovery-title">{token ? "ตั้งรหัสผ่านใหม่" : "ลืมรหัสผ่าน"}</h1><p>{token ? "ลิงก์ใช้ได้ครั้งเดียวภายใน 30 นาที" : "กรอกอีเมลที่ใช้เข้าสู่ระบบเพื่อรับลิงก์ตั้งรหัสผ่านใหม่"}</p></div>
    {!complete && <form className={styles.form} onSubmit={submit}>{token ? <><div className={styles.fieldGroup}><label htmlFor="new-password">รหัสผ่านใหม่ (8–128 ตัวอักษร)</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} /></div><div className={styles.fieldGroup}><label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label><input id="confirm-password" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} /></div></> : <div className={styles.fieldGroup}><label htmlFor="recovery-email">อีเมล</label><input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={254} required disabled={busy} /></div>}<button className={styles.primaryButton} disabled={busy}>{busy ? "กำลังดำเนินการ..." : token ? "บันทึกรหัสผ่านใหม่" : "ส่งลิงก์กู้คืนรหัสผ่าน"}</button></form>}
    {message && <p className={`${styles.notice} ${error ? styles.noticeError : ""}`} role={error ? "alert" : "status"}>{message}</p>}
    {token && error && <p><Link href="/forgot-password">ขอลิงก์กู้คืนใหม่</Link></p>}
    <p className={styles.supportText}><Link href="/">กลับไปเข้าสู่ระบบ</Link></p></section></main>;
}
