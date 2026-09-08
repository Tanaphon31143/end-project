"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

export default function TeacherError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="panel empty error-panel"><CircleAlert size={40} /><h2>ไม่สามารถโหลดข้อมูลได้</h2><p>กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ</p><button className="button primary" onClick={reset}><RefreshCw size={16} />ลองอีกครั้ง</button></div>;
}
