"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { CourseCard, type Course } from "@/components/teacher/CourseCard";
const courses: Course[] = [
  {
    id: 1,
    code: "ว30201",
    name: "วิทยาการคำนวณ",
    room: "ม.4/1",
    day: "วันจันทร์",
    time: "08:30–10:10",
    students: 36,
    color: "#255bd4",
  },
  {
    id: 2,
    code: "ว32102",
    name: "การเขียนโปรแกรม",
    room: "ม.5/2",
    day: "วันอังคาร",
    time: "10:20–12:00",
    students: 32,
    color: "#11906a",
  },
  {
    id: 3,
    code: "ว33101",
    name: "โครงงานคอมพิวเตอร์",
    room: "ม.6/1",
    day: "วันพฤหัสบดี",
    time: "13:00–14:40",
    students: 29,
    color: "#754bb8",
  },
  {
    id: 4,
    code: "ว30203",
    name: "เทคโนโลยีสารสนเทศ",
    room: "ม.4/3",
    day: "วันศุกร์",
    time: "09:20–11:00",
    students: 31,
    color: "#d07428",
  },
];
export default function Courses() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(1);
  return (
    <>
      <div className="page-head">
        <div>
          <h2>รายวิชาของฉัน</h2>
          <p>จัดการรายวิชาและสร้างรอบเช็คชื่อ</p>
        </div>
        <button className="button primary" onClick={() => setModal(true)}>
          <Plus size={17} />
          สร้างรอบเช็คชื่อ
        </button>
      </div>
      <section className="course-grid">
        {courses.map((c) => (
          <CourseCard
            key={c.id}
            course={c}
            onCreate={() => {
              setSelected(c.id);
              setModal(true);
            }}
          />
        ))}
      </section>
      {modal && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              setModal(false);
            }}
          >
            <div className="modal-head">
              <div>
                <h3>สร้างรอบเช็คชื่อ</h3>
                <p className="muted">กำหนดช่วงเวลาและเกณฑ์การมาสาย</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModal(false)}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>รายวิชา</label>
                <select
                  value={selected}
                  onChange={(e) => setSelected(+e.target.value)}
                >
                  {courses.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>วันที่</label>
                <input type="date" defaultValue="2026-09-03" />
              </div>
              <div className="field">
                <label>คาบเรียน</label>
                <select>
                  <option>คาบ 1–2</option>
                  <option>คาบ 3–4</option>
                  <option>คาบ 5–6</option>
                </select>
              </div>
              <div className="field">
                <label>เวลาเริ่ม</label>
                <input type="time" defaultValue="08:30" />
              </div>
              <div className="field">
                <label>เวลาสิ้นสุด</label>
                <input type="time" defaultValue="10:10" />
              </div>
              <div className="field full">
                <label>ถือว่ามาสายหลังเริ่มเรียน (นาที)</label>
                <input type="number" defaultValue="15" min="0" max="120" />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setModal(false)}
              >
                ยกเลิก
              </button>
              <button className="button primary">สร้างรอบเช็คชื่อ</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
