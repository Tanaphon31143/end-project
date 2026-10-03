"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarItem } from "@/components/portal/SidebarItem";
import type { RefObject } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  House,
  LogOut,
  ScanFace,
  School,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";

export const adminNavigation = [
  ["แดชบอร์ด", House, "/admin/dashboard"],
  ["จัดการผู้ใช้งาน", Users, "/admin/users"],
  ["จัดการนักเรียน", GraduationCap, "/admin/students"],
  ["จัดการครู", UserRound, "/admin/teachers"],
  ["จัดการชั้นเรียน", School, "/admin/classes"],
  ["จัดการวิชา", BookOpen, "/admin/subjects"],
  ["ข้อมูลใบหน้า", ScanFace, "/admin/faces"],
  ["เช็คชื่อ", ClipboardCheck, "/admin/attendance/check-in"],
  ["ข้อมูลการเข้าเรียน", CalendarDays, "/admin/attendance"],
  ["รายงานและสถิติ", BarChart3, "/admin/reports"],
  ["ตั้งค่าระบบ", Settings, "/admin/settings"],
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
  const pathname = usePathname();
  return (
    <>
      <button
        aria-label="ปิดเมนู"
        className={`admin-backdrop ${open ? "show" : ""}`}
        onClick={onClose}
      />
      <aside
        ref={sidebarRef}
        id="admin-navigation"
        className={`admin-sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? "true" : undefined}
        aria-label="แถบเมนูผู้ดูแลระบบ"
      >
        <button className="sidebar-x" onClick={onClose} aria-label="ปิดเมนู">
          <X size={21} />
        </button>
        <div className="admin-brand">
          <div className="brand-scan">
            <Image
              src="/school-logo.jpg"
              alt="ตราโรงเรียนขุขันธ์"
              width={48}
              height={48}
              priority
            />
          </div>
          <div className="brand-copy">
            <strong>โรงเรียนขุขันธ์</strong>
            <span>Khukhan School</span>
            <small>ADMINISTRATOR</small>
          </div>
        </div>
        <nav aria-label="เมนูหลัก">
          {adminNavigation.map(([label, Icon, href]) => {
            const active =
              href === "/admin/dashboard"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <SidebarItem
                key={label}
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
        <div className="sidebar-bottom">
          <div className="sidebar-school-card">
            <span className="sidebar-school-logo" aria-hidden="true">
              <Image src="/school-logo.jpg" alt="" width={42} height={42} />
            </span>
            <div><strong>โรงเรียนขุขันธ์</strong><span>อำเภอขุขันธ์ จังหวัดศรีสะเกษ</span></div>
          </div>
          <Link className="portal-sidebar-logout" href="/" title="ออกจากระบบ">
            <LogOut className="portal-sidebar-icon" size={19} />
            <span>ออกจากระบบ</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
