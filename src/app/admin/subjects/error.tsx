"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import "./requests.css";

export default function SubjectsError({ retry }: { retry: () => void }) {
  return (
    <main className="admin-content subjects-page">
      <div className="subjects-page-inner subjects-state" role="alert">
        <div>
          <span className="subjects-state-icon" aria-hidden="true">
            <AlertCircle size={22} />
          </span>
          <h1>โหลดข้อมูลรายวิชาไม่สำเร็จ</h1>
          <p>การเชื่อมต่ออาจขัดข้องชั่วคราว กรุณาลองโหลดข้อมูลอีกครั้ง</p>
          <button className="admin-button primary" type="button" onClick={retry}>
            <RotateCcw size={16} aria-hidden="true" />
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    </main>
  );
}
