import type { LucideIcon } from "lucide-react";
import { StatCard as SharedStatCard } from "@/components/portal/StatCard";
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
    <SharedStatCard
      label={label}
      value={value}
      detail={detail}
      tone={tone}
      icon={Icon}
      className="dashboard-stat-card"
    />
  );
}
