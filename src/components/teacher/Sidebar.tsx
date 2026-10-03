"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { SidebarItem } from "@/components/portal/SidebarItem";
import type { RefObject } from "react";
import {
  BookOpen,
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  ClipboardList,
  LogOut,
  ScanFace,
  UserRound,
  X,
} from "lucide-react";
const items = [
  ["/teacher/dashboard", "แดชบอร์ด", LayoutDashboard],
  ["/teacher/courses", "รายวิชาของฉัน", BookOpen],
  ["/teacher/subject-requests", "คำขอรายวิชา", ClipboardList],
  ["/teacher/scan", "เช็คชื่อด้วยใบหน้า", ScanFace],
  ["/teacher/history", "ประวัติการเข้าเรียน", History],
  ["/teacher/reports", "รายงาน", ChartNoAxesCombined],
  ["/teacher/profile", "โปรไฟล์", UserRound],
] as const;
export function Sidebar({
  open,
  collapsed,
  onClose,
  sidebarRef,
}: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
}) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "show" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={sidebarRef}
        id="teacher-navigation"
        className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? "true" : undefined}
        aria-label="แถบเมนูครูผู้สอน"
      >
        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="ปิดเมนู"
        >
          <X />
        </button>
        <div className="brand">
          <div className="brand-mark">
            <Image
              src="/school-logo.jpg"
              alt="ตราโรงเรียนขุขันธ์"
              width={160}
              height={89}
              unoptimized
              priority
            />
          </div>
          <div className="brand-copy">
            <b>โรงเรียนขุขันธ์</b>
            <span>Khukhan School</span>
            <small>TEACHER</small>
          </div>
        </div>
        <nav aria-label="เมนูครูผู้สอน">
          {items.map(([href, label, Icon]) => {
            const active =
              path === href ||
              (href !== "/teacher/dashboard" && path.startsWith(`${href}/`)) ||
              (href === "/teacher/scan" && path.startsWith("/teacher/scan/"));
            return (
              <SidebarItem
                key={href}
                href={href}
                label={label}
                icon={Icon}
                iconSize={21}
                strokeWidth={2.15}
                active={active}
                onClick={onClose}
              />
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <button
            className="teacher-logout portal-sidebar-logout"
            onClick={logout}
            title="ออกจากระบบ"
          >
            <LogOut className="portal-sidebar-icon" size={19} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
}
