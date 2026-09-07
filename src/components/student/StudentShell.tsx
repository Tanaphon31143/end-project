"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  BookOpen,
  Camera,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronsLeft,
  CircleUserRound,
  Clock3,
  FileWarning,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanFace,
  UserRound,
  X,
} from "lucide-react";
import { student } from "@/data/student";
const menu = [
  ["/student/dashboard", "แดชบอร์ด", LayoutDashboard],
  ["/student/profile", "ข้อมูลส่วนตัว", UserRound],
  ["/student/face", "ข้อมูลใบหน้า", ScanFace],
  ["/student/courses", "รายวิชาของฉัน", BookOpen],
  ["/student/attendance/scan", "เช็คชื่อ", Camera],
  ["/student/attendance/history", "ประวัติการเข้าเรียน", Clock3],
  ["/student/attendance/statistics", "สถิติการเข้าเรียน", ChartNoAxesCombined],
  ["/student/attendance/report", "แจ้งปัญหาการเช็คชื่อ", FileWarning],
] as const;
export default function StudentShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [drawer, setDrawer] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [profile, setProfile] = useState(false);
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <div className={`student-shell ${collapsed ? "is-collapsed" : ""}`}>
      {drawer && (
        <button
          className="student-overlay"
          aria-label="ปิดเมนู"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside className={`student-sidebar ${drawer ? "is-open" : ""}`}>
        <div className="student-brand">
          <span className="student-logo">
            <Image
              src="/school-logo.jpg"
              width={43}
              height={43}
              alt="ตราโรงเรียนขุขันธ์"
              priority
            />
          </span>
          <div className="student-brand-copy">
            <strong>ระบบเช็คชื่อ</strong>
            <span>ด้วยการสแกนใบหน้า</span>
            <small>โรงเรียนขุขันธ์</small>
          </div>
          <button
            className="student-mobile-close"
            onClick={() => setDrawer(false)}
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>
        <div className="student-role">
          <GraduationCap size={19} />
          <span>พื้นที่สำหรับนักเรียน</span>
        </div>
        <nav className="student-nav" aria-label="เมนูนักเรียน">
          {menu.map(([href, label, Icon]) => (
            <Link
              href={href}
              key={href}
              title={label}
              className={pathname === href ? "active" : ""}
              onClick={() => setDrawer(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="student-sidebar-footer">
          <button className="student-logout" onClick={logout}>
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
          <button
            className="student-collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
          >
            <ChevronsLeft size={19} />
          </button>
        </div>
      </aside>
      <div className="student-workspace">
        <header className="student-header">
          <button
            className="student-menu-button mobile"
            onClick={() => setDrawer(true)}
            aria-label="เปิดเมนู"
          >
            <Menu size={22} />
          </button>
          <div className="student-header-title">
            <strong>ระบบเช็คชื่อนักเรียน</strong>
            <span>โรงเรียนขุขันธ์</span>
          </div>
          <div className="student-header-actions">
            <button className="notification" aria-label="การแจ้งเตือน">
              <Bell size={21} />
              <i />
            </button>
            <div className="profile-wrap">
              <button
                className="profile-trigger"
                onClick={() => setProfile((v) => !v)}
                aria-expanded={profile}
              >
                <span className="avatar small">{student.initials}</span>
                <span className="profile-copy">
                  <b>{student.name}</b>
                  <small>นักเรียน</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profile && (
                <div className="profile-menu">
                  <Link
                    href="/student/profile"
                    onClick={() => setProfile(false)}
                  >
                    <CircleUserRound size={18} /> ข้อมูลส่วนตัว
                  </Link>
                  <button onClick={logout}>
                    <LogOut size={18} /> ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="student-content">{children}</main>
      </div>
    </div>
  );
}
