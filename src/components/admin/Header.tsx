"use client";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Bell, ChevronDown, CircleUserRound, LogOut, Menu, Search } from "lucide-react";

const pageTitles: Record<string, [string, string]> = {
  "/admin/dashboard": ["แดชบอร์ดผู้ดูแลระบบ", "ระบบเช็คชื่อด้วยการสแกนใบหน้า"],
  "/admin/users": ["จัดการผู้ใช้งาน", "จัดการสิทธิ์และบัญชีผู้ใช้งานในระบบ"],
  "/admin/students": ["ข้อมูลนักเรียน", "จัดการทะเบียนและข้อมูลนักเรียน"],
  "/admin/teachers": ["ข้อมูลครู", "จัดการข้อมูลครูและรายวิชาที่รับผิดชอบ"],
  "/admin/subjects": ["รายวิชา", "จัดการรายวิชาและครูผู้สอน"],
  "/admin/classes": ["ชั้นเรียน", "จัดการห้องเรียนและรายชื่อนักเรียน"],
  "/admin/faces": ["ข้อมูลใบหน้า", "จัดการข้อมูลอ้างอิงสำหรับการตรวจจับใบหน้า"],
  "/admin/attendance/check-in": ["เช็คชื่อด้วยใบหน้า", "ตรวจจับและบันทึกเวลาเข้าเรียนแบบเรียลไทม์"],
  "/admin/attendance": ["ข้อมูลการเข้าเรียน", "ตรวจสอบและจัดการประวัติการเข้าเรียน"],
  "/admin/reports": ["รายงานและสถิติ", "วิเคราะห์ภาพรวมการเข้าเรียนของโรงเรียน"],
  "/admin/settings": ["ตั้งค่าระบบ", "กำหนดค่าการทำงานของระบบเช็คชื่อ"],
};

export function Header({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  const [title, subtitle] = pageTitles[pathname] ?? pageTitles["/admin/dashboard"];
  return <header className="admin-header">
    <div className="header-title-wrap">
      <button className="mobile-menu" onClick={onMenu} aria-label="เปิดเมนู"><Menu /></button>
      <div><h1>{title}</h1><p>{subtitle}</p></div>
    </div>
    <div className="header-actions">
      <label className="search-box"><span className="sr-only">ค้นหา</span><input placeholder="ค้นหา..." /><Search size={19} /></label>
      <button className="bell" aria-label="การแจ้งเตือน 3 รายการ"><Bell size={20} /><span>3</span></button>
      <div className="admin-profile-wrap">
        <button className="profile" onClick={() => setProfileOpen(value => !value)} aria-expanded={profileOpen} aria-haspopup="menu"><span className="profile-avatar">ผด</span><span className="profile-copy"><b>ผู้ดูแลระบบ</b><small>ผู้ดูแลสูงสุด</small></span><ChevronDown className={profileOpen ? "rotated" : ""} size={17} /></button>
        {profileOpen && <div className="admin-profile-menu" role="menu"><Link href="/admin/settings" onClick={() => setProfileOpen(false)}><CircleUserRound size={18}/> ข้อมูลส่วนตัว</Link><button onClick={logout}><LogOut size={18}/> ออกจากระบบ</button></div>}
      </div>
    </div>
  </header>;
}
