import type { LucideIcon } from "lucide-react";
import { StatCard as SharedStatCard } from "@/components/portal/StatCard";
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <SharedStatCard
      label={label}
      value={value}
      detail={detail}
      tone={tone}
      icon={Icon}
      className="card"
    />
  );
}
export function Badge({ children }: { children: string }) {
  const cls =
    children === "มาเรียน" || children === "เสร็จสิ้น"
      ? "success"
      : children === "สาย" || children === "กำลังตรวจสอบ"
        ? "warning"
        : children === "ขาด" || children === "ปฏิเสธ"
          ? "danger"
          : children === "ลา"
            ? "purple"
            : "info";
  return <span className={`badge ${cls}`}>{children}</span>;
}
