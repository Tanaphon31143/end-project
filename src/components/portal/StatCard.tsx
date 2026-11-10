import type { LucideIcon } from "lucide-react";
import { CountUp } from "./CountUp";

export function StatCard({
  label,
  value,
  detail,
  tone = "blue",
  icon: Icon,
  className = "",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <article className={`stat-card ${className}`}>
      <div className={`stat-icon ${tone}`}>
        <Icon size={21} aria-hidden="true" />
      </div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong><CountUp value={value} /></strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}
