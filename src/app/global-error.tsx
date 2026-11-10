"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./status-page.module.css";

// Replaces the root layout when it fails, so it brings its own document and font stack.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: 'Tahoma, "Leelawadee UI", Arial, sans-serif' }}>
        <title>เกิดข้อผิดพลาด | School OS</title>
        <main className={styles.page}>
          <section className={styles.card}>
            <h1 className={styles.title}>เกิดข้อผิดพลาด</h1>
            <p className={styles.message}>ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งผู้ดูแลระบบ</p>
            <div className={styles.actions}>
              <button className={styles.primary} type="button" onClick={() => retry()}>ลองใหม่</button>
              <Link className={styles.secondary} href="/">กลับหน้าแรก</Link>
            </div>
            {error.digest ? <p className={styles.reference}>รหัสอ้างอิง {error.digest}</p> : null}
          </section>
        </main>
      </body>
    </html>
  );
}
