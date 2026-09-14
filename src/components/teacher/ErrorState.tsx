"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

export function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="panel dashboard-error" role="alert">
      <div className="dashboard-empty-icon"><CircleAlert size={22} aria-hidden="true" /></div>
      <h2>โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</h2>
      <p>กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ</p>
      <button className="button primary" onClick={reset}><RefreshCw size={16} aria-hidden="true" />ลองใหม่</button>
    </div>
  );
}
