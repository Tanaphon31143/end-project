"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./status-page.module.css";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>เกิดข้อผิดพลาด</h1>
        <p className={styles.message}>ระบบโหลดหน้านี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ</p>
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={() => retry()}>ลองใหม่</button>
          <Link className={styles.secondary} href="/">กลับหน้าแรก</Link>
        </div>
        {error.digest ? <p className={styles.reference}>รหัสอ้างอิง {error.digest}</p> : null}
      </section>
    </main>
  );
}
