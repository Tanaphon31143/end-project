import { Inbox, type LucideIcon } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="dashboard-empty">
      <div className="dashboard-empty-icon">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  );
}
