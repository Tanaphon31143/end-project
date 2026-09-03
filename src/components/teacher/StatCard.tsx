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
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={tone}>{detail}</small>
      </div>
    </article>
  );
}
