import type { LucideIcon } from "lucide-react";
export function StatCard({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: LucideIcon;
}) {
  return (
    <article className="stat-card dashboard-stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="dashboard-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
