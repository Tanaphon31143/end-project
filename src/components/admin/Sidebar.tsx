"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CalendarDays, ChevronsLeft, ClipboardCheck, GraduationCap, House, LogOut, ScanFace, School, Settings, UserRound, Users, X } from "lucide-react";

export const adminNavigation = [
  ["แดชบอร์ด", House, "/admin/dashboard"], ["จัดการผู้ใช้งาน", Users, "/admin/users"], ["ข้อมูลนักเรียน", GraduationCap, "/admin/students"],
  ["ข้อมูลครู", UserRound, "/admin/teachers"], ["รายวิชา", BookOpen, "/admin/subjects"], ["ชั้นเรียน", School, "/admin/classes"], ["ข้อมูลใบหน้า", ScanFace, "/admin/faces"],
  ["เช็คชื่อ", ClipboardCheck, "/admin/attendance/check-in"], ["ข้อมูลการเข้าเรียน", CalendarDays, "/admin/attendance"], ["รายงานและสถิติ", BarChart3, "/admin/reports"], ["ตั้งค่าระบบ", Settings, "/admin/settings"],
] as const;

export function Sidebar({ open, collapsed, onClose, onCollapse }: { open: boolean; collapsed: boolean; onClose: () => void; onCollapse: () => void }) {
  const pathname = usePathname();
  return <>
    <button aria-label="ปิดเมนู" className={`admin-backdrop ${open ? "show" : ""}`} onClick={onClose} />
    <aside className={`admin-sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      <button className="sidebar-x" onClick={onClose} aria-label="ปิดเมนู"><X size={21} /></button>
      <div className="admin-brand">
        <div className="brand-scan"><Image src="/school-logo.jpg" alt="ตราโรงเรียนขุขันธ์" width={48} height={48} priority /></div>
        <div className="brand-copy"><strong>ระบบเช็คชื่อ</strong><span>ด้วยการสแกนใบหน้า</span><small>โรงเรียนขุขันธ์</small></div>
      </div>
      <nav aria-label="เมนูหลัก">
        {adminNavigation.map(([label, Icon, href]) => {
          const active = href === "/admin/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={label} href={href} className={active ? "active" : ""} title={label} onClick={onClose}><Icon size={19} /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <Link href="/" title="ออกจากระบบ"><LogOut size={19} /><span>ออกจากระบบ</span></Link>
        <button onClick={onCollapse} aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"} title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}><ChevronsLeft size={19} /></button>
      </div>
    </aside>
  </>;
}
