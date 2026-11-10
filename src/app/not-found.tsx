import type { Metadata } from "next";
import Link from "next/link";
import styles from "./status-page.module.css";

export const metadata: Metadata = {
  title: "ไม่พบหน้านี้ | School OS",
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>ไม่พบหน้าที่ต้องการ</h1>
        <p className={styles.message}>ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกย้ายไปแล้ว</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/">กลับหน้าแรก</Link>
        </div>
      </section>
    </main>
  );
}
