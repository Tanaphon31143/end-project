"use client";
import { useState } from "react";
import { ImagePlus, Send, CheckCircle2 } from "lucide-react";
import { courses } from "@/data/student";
export default function IssueForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="report-form"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      {sent && (
        <div className="form-success">
          <CheckCircle2 size={20} /> ส่งคำร้องเรียบร้อยแล้ว
          เจ้าหน้าที่จะตรวจสอบภายใน 1–2 วันทำการ
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label>วันที่เกิดปัญหา</label>
          <input required className="input" type="date" />
        </div>
        <div className="field">
          <label>รายวิชา</label>
          <select required className="select" defaultValue="">
            <option value="" disabled>
              เลือกรายวิชา
            </option>
            {courses.map((c) => (
              <option key={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>เวลาเรียน</label>
          <input required className="input" type="time" />
        </div>
        <div className="field">
          <label>ห้องเรียน</label>
          <input required className="input" placeholder="เช่น Lab 3" />
        </div>
        <div className="field full">
          <label>ประเภทปัญหา</label>
          <select required className="select" defaultValue="">
            <option value="" disabled>
              เลือกประเภทปัญหา
            </option>
            {[
              "สแกนสำเร็จแต่สถานะเป็นขาด",
              "สแกนไม่ติด",
              "ไม่พบใบหน้า",
              "ระบบไม่เปิดกล้อง",
              "เช็คชื่อผิดเวลา",
              "อื่น ๆ",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <div className="field full">
          <label>รายละเอียดปัญหา</label>
          <textarea
            required
            className="textarea"
            placeholder="อธิบายเหตุการณ์ เวลาที่เกิดปัญหา และข้อความที่ระบบแสดง"
          />
        </div>
        <label className="upload full">
          <ImagePlus size={25} />
          <span>
            <b>แนบรูปภาพประกอบ</b>
            <small>PNG, JPG ขนาดไม่เกิน 5 MB</small>
          </span>
          <input type="file" accept="image/png,image/jpeg" />
        </label>
      </div>
      <div className="form-actions">
        <button className="button primary" type="submit">
          <Send size={17} /> ส่งคำร้อง
        </button>
      </div>
    </form>
  );
}
