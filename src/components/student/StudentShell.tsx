"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "./NotificationBell";
import { useStudentToast } from "./StudentToast";
import { SidebarItem } from "@/components/portal/SidebarItem";
import { useResponsiveOverlay } from "@/components/portal/useResponsiveOverlay";
import {
  Bell,
  BookOpen,
  Camera,
  ChartNoAxesCombined,
  ChevronDown,
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
import type { StudentIdentity } from "@/lib/student-data";

const menu = [
  ["/student/dashboard", "หน้าแรก", LayoutDashboard],
  ["/student/profile", "ข้อมูลส่วนตัว", UserRound],
  ["/student/face", "ข้อมูลใบหน้า", ScanFace],
  ["/student/courses", "รายวิชาของฉัน", BookOpen],
  ["/student/attendance/scan", "เช็คชื่อเข้าเรียน", Camera],
  ["/student/attendance/history", "ประวัติการเข้าเรียน", Clock3],
  ["/student/attendance/statistics", "สถิติการเข้าเรียน", ChartNoAxesCombined],
  ["/student/attendance/report", "แจ้งปัญหาการเช็คชื่อ", FileWarning],
  ["/student/notifications", "การแจ้งเตือน", Bell],
] as const;

export default function StudentShell({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: StudentIdentity;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [drawer, setDrawer] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [profile, setProfile] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const notify = useStudentToast();
  const [loggingOut, setLoggingOut] = useState(false);

  useResponsiveOverlay({
    open: drawer,
    onClose: () => setDrawer(false),
    containerRef: sidebarRef,
    triggerRef: menuTriggerRef,
    mediaQuery: "(max-width: 1023px)",
    trapFocus: true,
  });

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.push("/");
      router.refresh();
    } catch {
      notify("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  // Close profile and drawer on route change
  useEffect(() => {
    queueMicrotask(() => {
      setProfile(false);
      setDrawer(false);
    });
  }, [pathname]);

  // Close profile on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfile(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && profile) {
        setProfile(false);
        profileTriggerRef.current?.focus();
      }
    }

    if (profile) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profile]);

  return (
    <div className={`student-shell ${collapsed ? "is-collapsed" : ""}`}>
      <a className="student-skip-link" href="#student-main">
        ข้ามไปยังเนื้อหา
      </a>
      {drawer && (
        <button
          className="student-overlay"
          aria-label="ปิดเมนู"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="student-navigation"
        inert={mobile && !drawer}
        className={`student-sidebar ${drawer ? "is-open" : ""}`}
        role={drawer ? "dialog" : undefined}
        aria-modal={drawer ? "true" : undefined}
        aria-label="แถบเมนูนักเรียน"
      >
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
            <strong>โรงเรียนขุขันธ์</strong>
            <span>Khukhan School</span>
            <small>STUDENT</small>
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
            <SidebarItem
              href={href}
              key={href}
              label={label}
              icon={Icon}
              iconSize={21}
              strokeWidth={2.15}
              active={pathname === href || pathname.startsWith(href + "/")}
              onClick={() => setDrawer(false)}
            />
          ))}
        </nav>
        <div className="student-sidebar-footer">
          <button
            className="student-logout portal-sidebar-logout"
            onClick={logout}
            disabled={loggingOut}
          >
            <LogOut className="portal-sidebar-icon" size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
      <div className="student-workspace" inert={drawer}>
        <header className="student-header">
          <button
            className="student-menu-button desktop"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            aria-expanded={!collapsed}
            aria-controls="student-navigation"
          >
            <Menu size={22} />
          </button>
          <button
            ref={menuTriggerRef}
            className="student-menu-button mobile"
            onClick={() => setDrawer(true)}
            aria-label="เปิดเมนู"
            aria-expanded={drawer}
            aria-controls="student-navigation"
          >
            <Menu size={22} />
          </button>
          <div className="student-header-title">
            <strong>ระบบเช็คชื่อนักเรียน</strong>
            <span>โรงเรียนขุขันธ์</span>
          </div>
          <div className="student-header-actions">
            <NotificationBell />
            <div className="profile-wrap" ref={profileRef}>
              <button
                ref={profileTriggerRef}
                className="profile-trigger"
                onClick={() => setProfile((v) => !v)}
                aria-expanded={profile}
                aria-label="เมนูโปรไฟล์ผู้ใช้"
              >
                <span className="student-header-avatar">
                  {identity.hasProfileImage ? (
                    <Image
                      src="/api/student/profile-image"
                      alt="รูปนักเรียน"
                      width={40}
                      height={40}
                      sizes="40px"
                      unoptimized
                    />
                  ) : (
                    identity.initials
                  )}
                </span>
                <span className="profile-copy">
                  <b>{identity.name}</b>
                  <small>นักเรียน</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profile && (
                <div className="profile-menu" aria-label="เมนูโปรไฟล์">
                  <Link
                    href="/student/profile"
                    onClick={() => setProfile(false)}
                  >
                    <CircleUserRound size={18} /> ข้อมูลส่วนตัว
                  </Link>
                  <Link
                    href="/student/notifications"
                    onClick={() => setProfile(false)}
                  >
                    <Bell size={18} /> การแจ้งเตือน
                  </Link>
                  <button onClick={logout} disabled={loggingOut}>
                    <LogOut size={18} /> ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="student-main" tabIndex={-1} className="student-content">
          {children}
        </main>
      </div>
    </div>
  );
}
