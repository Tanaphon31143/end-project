"use client";
import { useState } from "react";
import { FileBarChart } from "lucide-react";
import { AttendanceChart } from "@/components/teacher/AttendanceChart";
export default function Reports() {
  const [tab, setTab] = useState("รายสัปดาห์");
  return (
    <>
      <div className="page-head">
        <div>
          <h2>รายงานการเข้าเรียน</h2>
          <p>สรุปข้อมูลเฉพาะรายวิชาที่คุณรับผิดชอบ</p>
        </div>
      </div>
      <div className="tabs">
        {["รายวัน", "รายสัปดาห์", "รายเดือน"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab ${tab === t ? "active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="panel">
        <form
          className="filters"
          style={{ gridTemplateColumns: "1.4fr 1fr 1fr auto" }}
        >
          <select>
            <option>ทุกรายวิชา</option>
            <option>ว30201 วิทยาการคำนวณ</option>
          </select>
          <input type="date" defaultValue="2026-08-27" />
          <input type="date" defaultValue="2026-09-03" />
          <button className="button primary">
            <FileBarChart size={17} />
            สร้างรายงาน
          </button>
        </form>
      </section>
      <section className="report-summary">
        <div className="summary-box">
          <span>อัตราการเข้าเรียนเฉลี่ย</span>
          <b className="green">86.4%</b>
        </div>
        <div className="summary-box">
          <span>เข้าเรียนรวม</span>
          <b>437</b>
        </div>
        <div className="summary-box">
          <span>มาสายรวม</span>
          <b className="yellow">38</b>
        </div>
        <div className="summary-box">
          <span>ขาดเรียนรวม</span>
          <b className="red">29</b>
        </div>
      </section>
      <article className="panel">
        <div className="panel-head">
          <div>
            <h3>แนวโน้มการเข้าเรียน — {tab}</h3>
            <span className="muted">
              คิดเป็นร้อยละของนักเรียนในแต่ละช่วงเวลา
            </span>
          </div>
          <button className="button ghost" disabled>
            ส่งออก Excel / PDF (เร็ว ๆ นี้)
          </button>
        </div>
        <AttendanceChart />
      </article>
    </>
  );
}
