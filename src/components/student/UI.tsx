import type { LucideIcon } from "lucide-react";
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
    <article className="card stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
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
