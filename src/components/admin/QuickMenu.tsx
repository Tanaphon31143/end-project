import Link from "next/link";
import { BarChart3, ChevronRight, ScanFace, UserPlus } from "lucide-react";

const links = [
  ["เพิ่มนักเรียน", UserPlus, "blue", "/admin/students"],
  ["เพิ่มครู", UserPlus, "green", "/admin/teachers"],
  ["ลงทะเบียนใบหน้า", ScanFace, "purple", "/admin/faces"],
  ["ดูรายงาน", BarChart3, "orange", "/admin/reports"],
] as const;
export function QuickMenu() {
  return (
    <section className="dashboard-card quick-card">
      <div className="card-head">
        <div>
          <h2>เมนูลัด</h2>
          <p>จัดการข้อมูลได้ทันที</p>
        </div>
      </div>
      <div className="quick-list">
        {links.map(([label, Icon, tone, href]) => (
          <Link href={href} key={label}>
            <span className={`quick-icon ${tone}`}>
              <Icon size={20} />
            </span>
            <b>{label}</b>
            <ChevronRight size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
