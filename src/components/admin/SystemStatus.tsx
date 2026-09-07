"use client";

import Link from "next/link";
import { Camera, ChevronRight, Database, ScanFace } from "lucide-react";
import { useEffect, useState } from "react";

type HealthState = "checking" | "ok" | "error";

export function SystemStatus() {
  const [database, setDatabase] = useState<HealthState>("checking");
  const [camera, setCamera] = useState<HealthState>("checking");

  useEffect(() => {
    queueMicrotask(() => setCamera(Boolean(navigator.mediaDevices?.getUserMedia) ? "ok" : "error"));
    fetch("/api/db-health")
      .then((response) => setDatabase(response.ok ? "ok" : "error"))
      .catch(() => setDatabase("error"));
  }, []);

  const systems = [
    { label: "กล้องตรวจจับใบหน้า", Icon: Camera, state: camera },
    { label: "ฐานข้อมูล", Icon: Database, state: database },
    { label: "ระบบ AI ตรวจจับใบหน้า", Icon: ScanFace, state: "ok" as HealthState },
  ];

  return <section className="dashboard-card status-card">
    <div className="card-head"><div><h2>สถานะระบบ</h2><p>ตรวจสอบจากอุปกรณ์และบริการปัจจุบัน</p></div></div>
    <div className="system-list">{systems.map(({ label, Icon, state }) => {
      const checking = state === "checking";
      const ok = state === "ok";
      return <div className="system-status-row" key={label}>
        <span className="system-icon"><Icon size={19}/></span>
        <span className="system-name"><b>{label}</b><small>{checking ? "กำลังตรวจสอบ" : ok ? "พร้อมใช้งาน" : "ไม่พร้อมใช้งาน"}</small></span>
        <span className={ok ? "normal" : checking ? "status-checking" : "status-error"}><i/>{checking ? "ตรวจสอบ" : ok ? "ปกติ" : "ผิดปกติ"}</span>
      </div>;
    })}</div>
    <Link className="view-all" href="/admin/settings">ดูสถานะทั้งหมด <ChevronRight size={15}/></Link>
  </section>;
}
