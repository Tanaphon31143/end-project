"use client";
import { useEffect, useState } from "react";
import { Check, ScanFace, X } from "lucide-react";
const rows = [
  {
    code: "6501001",
    name: "กิตติพงษ์ แสงดี",
    time: "10:21:08",
    status: "PRESENT",
  },
  {
    code: "6501004",
    name: "ณัฐชา อินทร์แก้ว",
    time: "10:23:31",
    status: "PRESENT",
  },
  {
    code: "6501012",
    name: "พีรพัฒน์ วงศ์งาม",
    time: "10:38:02",
    status: "LATE",
  },
];
export function LiveScanFeed() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(i);
  }, []);
  return (
    <>
      <section className="scan-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>กล้องตรวจจับใบหน้า</h3>
              <span className="muted">หันหน้าเข้าหากล้องและอยู่ในกรอบ</span>
            </div>
            <span className="status active">● ออนไลน์</span>
          </div>
          <div className="camera">
            <div className="camera-corners" />
            <ScanFace size={55} />
            <p>กำลังตรวจจับใบหน้า... {tick % 3 ? "" : ""}</p>
          </div>
        </article>
        <article className="panel student-result">
          <h3>ตรวจพบนักเรียน</h3>
          <div className="profile-photo">พว</div>
          <h3>พีรพัฒน์ วงศ์งาม</h3>
          <p className="muted">6501012 · ม.5/2</p>
          <div className="detail-list">
            <div className="detail-row">
              <span>เวลา</span>
              <b>10:38:02 น.</b>
            </div>
            <div className="detail-row">
              <span>ความมั่นใจ</span>
              <b className="green">96.8%</b>
            </div>
            <div className="confidence">
              <i />
            </div>
            <div className="detail-row">
              <span>สถานะ</span>
              <span className="status LATE">มาสาย</span>
            </div>
          </div>
          <div className="course-actions">
            <button className="button danger">
              <X size={16} />
              ยกเลิก
            </button>
            <button className="button primary">
              <Check size={16} />
              ยืนยัน
            </button>
          </div>
        </article>
      </section>
      <article className="panel scan-table">
        <div className="panel-head">
          <div>
            <h3>สถานะการเช็คชื่อแบบเรียลไทม์</h3>
            <span className="muted">ว32102 · การเขียนโปรแกรม ม.5/2</span>
          </div>
          <b>เช็คแล้ว 28 / 32 คน</b>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ-นามสกุล</th>
                <th>เวลา</th>
                <th>สถานะ</th>
                <th>ความมั่นใจ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.code}>
                  <td>{r.code}</td>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td>{r.time}</td>
                  <td>
                    <span className={`status ${r.status}`}>
                      {r.status === "PRESENT" ? "เข้าเรียน" : "มาสาย"}
                    </span>
                  </td>
                  <td>{[98.2, 97.5, 96.8][i]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
