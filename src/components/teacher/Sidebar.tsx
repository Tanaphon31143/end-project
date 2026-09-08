"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronsLeft,
  History,
  LayoutDashboard,
  LogOut,
  ScanFace,
  School,
  UserRound,
  X,
} from "lucide-react";
import type { TeacherIdentity } from "@/lib/teacher-data";
const items = [
  ["/teacher/dashboard", "แดชบอร์ด", LayoutDashboard],
  ["/teacher/courses", "รายวิชาของฉัน", BookOpen],
  ["/teacher/scan", "เช็คชื่อด้วยใบหน้า", ScanFace],
  ["/teacher/history", "ประวัติการเข้าเรียน", History],
  ["/teacher/reports", "รายงาน", ChartNoAxesCombined],
  ["/teacher/profile", "โปรไฟล์", UserRound],
] as const;
export function Sidebar({
  identity,
  open,
  collapsed,
  onClose,
  onCollapse,
}: {
  identity: TeacherIdentity;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onCollapse: () => void;
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
      />
      <aside
        className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
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
              width={43}
              height={43}
              priority
            />
          </div>
          <div className="brand-copy">
            <b>ระบบเช็คชื่อ</b>
            <span>ด้วยการสแกนใบหน้า</span>
            <small>โรงเรียนขุขันธ์</small>
          </div>
        </div>
        <div className="teacher-role">
          <School size={19} />
          <span>พื้นที่สำหรับครูผู้สอน</span>
        </div>
        <nav aria-label="เมนูครูผู้สอน">
          {items.map(([href, label, Icon]) => {
            const active =
              path === href ||
              (href !== "/teacher/dashboard" && path.startsWith(`${href}/`)) ||
              (href === "/teacher/scan" && path.startsWith("/teacher/scan/"));
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                title={label}
                onClick={onClose}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="teacher-profile">
            <div className="mini-avatar">
              {identity.hasProfileImage ? (
                <Image
                  src="/api/teacher/profile-image"
                  alt="รูปครู"
                  width={38}
                  height={38}
                  unoptimized
                />
              ) : (
                identity.initials
              )}
            </div>
            <div className="teacher-profile-copy">
              <b>{identity.name}</b>
              <span>{identity.position}</span>
            </div>
          </div>
          <button
            className="teacher-logout"
            onClick={logout}
            title="ออกจากระบบ"
          >
            <LogOut size={19} />
            <span>ออกจากระบบ</span>
          </button>
          <button
            className="sidebar-collapse"
            onClick={onCollapse}
            aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
          >
            <ChevronsLeft size={19} />
          </button>
        </div>
      </aside>
    </>
  );
}
