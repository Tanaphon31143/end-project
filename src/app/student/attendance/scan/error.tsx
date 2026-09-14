"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function ScanError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <section className="card card-pad scan-route-error" role="alert">
      <AlertCircle size={36} />
      <h2>โหลดระบบเช็คชื่อไม่สำเร็จ</h2>
      <p>โปรดลองโหลดข้อมูลคาบเรียนใหม่ หากยังพบปัญหาให้ติดต่อครูผู้สอน</p>
      <button type="button" className="button primary" onClick={retry}>
        <RefreshCw size={16} /> ลองใหม่
      </button>
    </section>
  );
}
