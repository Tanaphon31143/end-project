"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

export default function SubjectRequestsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="subject-request-page">
      <section className="panel dashboard-error" role="alert">
        <div className="dashboard-empty-icon">
          <CircleAlert size={22} aria-hidden="true" />
        </div>
        <h2>โหลดคำขอรายวิชาไม่สำเร็จ</h2>
        <p>การเชื่อมต่อฐานข้อมูลขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง</p>
        <button type="button" className="button primary" onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" />
          ลองใหม่
        </button>
      </section>
    </main>
  );
}
