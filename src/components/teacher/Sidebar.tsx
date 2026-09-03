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
  UserRound,
  X,
} from "lucide-react";
const items = [
  ["/teacher/dashboard", "แดชบอร์ด", LayoutDashboard],
  ["/teacher/courses", "รายวิชาของฉัน", BookOpen],
  ["/teacher/scan/demo", "เช็คชื่อด้วยใบหน้า", ScanFace],
  ["/teacher/history", "ประวัติการเข้าเรียน", History],
  ["/teacher/reports", "รายงาน", ChartNoAxesCombined],
  ["/teacher/profile", "โปรไฟล์", UserRound],
] as const;
export function Sidebar({
  open,
  collapsed,
  onClose,
  onCollapse,
}: {
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
      <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="ปิดเมนู"
        >
          <X />
        </button>
        <div className="brand">
          <div className="brand-mark">
            <Image src="/school-logo.jpg" alt="ตราโรงเรียนขุขันธ์" width={43} height={43} priority />
          </div>
          <div className="brand-copy">
            <b>ระบบเช็คชื่อ</b>
            <span>ด้วยการสแกนใบหน้า</span>
            <small>โรงเรียนขุขันธ์</small>
          </div>
        </div>
        <nav>
          {items.map(([href, label, Icon]) => {
            const active =
              path === href ||
              (href.includes("scan") && path.startsWith("/teacher/scan"));
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
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
            <div className="mini-avatar">สม</div>
            <div className="teacher-profile-copy">
            <b>สมชาย ใจดี</b>
            <span>ครูผู้สอน</span>
            </div>
          </div>
          <button className="teacher-logout" onClick={logout} title="ออกจากระบบ">
            <LogOut size={19} />
            <span>ออกจากระบบ</span>
          </button>
          <button className="sidebar-collapse" onClick={onCollapse} aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"} title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}><ChevronsLeft size={19} /></button>
        </div>
      </aside>
    </>
  );
}
