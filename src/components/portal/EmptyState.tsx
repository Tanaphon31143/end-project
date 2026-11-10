import Link from "next/link";
import { ArrowRight, Inbox, type LucideIcon } from "lucide-react";
import "./EmptyState.css";

/** Empty list/panel message shared by all three portals: icon, title, optional hint and next step. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
  tone = "blue",
  className = "",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { href: string; label: string };
  compact?: boolean;
  tone?: "blue" | "green" | "amber" | "violet" | "slate";
  className?: string;
}) {
  return (
    <div className={`portal-empty ${compact ? "is-compact" : ""} ${className}`} data-tone={tone}>
      <span className="portal-empty-icon" aria-hidden="true">
        <Icon size={compact ? 20 : 24} />
      </span>
      <p className="portal-empty-title">{title}</p>
      {description ? <p className="portal-empty-description">{description}</p> : null}
      {action ? (
        <Link className="portal-empty-action" href={action.href}>
          {action.label}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
