"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
const titles: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  courses: "รายวิชาของฉัน",
  scan: "เช็คชื่อด้วยใบหน้า",
  history: "ประวัติการเข้าเรียน",
  reports: "รายงานการเข้าเรียน",
  profile: "โปรไฟล์",
};
export function TeacherShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const segment = usePathname().split("/")[2] || "dashboard";
  return (
    <div className={`teacher-app ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar open={open} collapsed={collapsed} onClose={() => setOpen(false)} onCollapse={() => setCollapsed(value => !value)} />
      <div className="teacher-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="menu-button"
              onClick={() => setOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu />
            </button>
            <h1>{titles[segment]}</h1>
          </div>
          <div className="topbar-user">
            <button className="notification" aria-label="การแจ้งเตือน">
              <Bell size={20} />
              <i />
            </button>
            <div className="avatar">สจ</div>
            <div className="user-copy">
              <b>สมชาย ใจดี</b>
              <span>ครูผู้สอน</span>
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
