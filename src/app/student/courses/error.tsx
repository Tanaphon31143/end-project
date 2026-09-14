"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function CoursesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <section className="card card-pad scan-route-error" role="alert">
      <AlertCircle size={36} />
      <h2>โหลดข้อมูลรายวิชาไม่สำเร็จ</h2>
      <p>กรุณาลองโหลดข้อมูลใหม่อีกครั้ง</p>
      <button type="button" className="button primary" onClick={retry}>
        <RefreshCw size={16} /> ลองใหม่
      </button>
    </section>
  );
}
