import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  iconSize = 20,
  strokeWidth,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
  iconSize?: number;
  strokeWidth?: number;
}) {
  return (
    <Link
      href={href}
      className={`portal-sidebar-item${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={label}
      onClick={onClick}
    >
      <Icon
        className="portal-sidebar-icon"
        size={iconSize}
        strokeWidth={strokeWidth}
        aria-hidden="true"
      />
      <span>{label}</span>
    </Link>
  );
}
