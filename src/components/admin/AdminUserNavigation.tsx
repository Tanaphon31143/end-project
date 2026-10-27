"use client";

import {
  ChevronDown,
  GraduationCap,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import "./AdminUserNavigation.css";

const userPages: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [
  { label: "ทั้งหมด", href: "/admin/users", icon: Users },
  { label: "ครู", href: "/admin/teachers", icon: UserRound },
  { label: "นักเรียน", href: "/admin/students", icon: GraduationCap },
];

function isCurrentPage(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminUserNavigation({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isUserManagementPage = userPages.some(({ href }) =>
    isCurrentPage(pathname, href),
  );
  const [expanded, setExpanded] = useState(isUserManagementPage);

  return (
    <div className="admin-user-navigation">
      <button
        type="button"
        className={`admin-user-navigation__toggle portal-sidebar-item${isUserManagementPage ? " active" : ""}`}
        aria-label="จัดการผู้ใช้งาน"
        aria-expanded={expanded}
        aria-controls="admin-user-navigation-pages"
        title="จัดการผู้ใช้งาน"
        onClick={() => setExpanded((value) => !value)}
      >
        <Users
          className="admin-user-navigation__icon portal-sidebar-icon"
          size={21}
          strokeWidth={2.15}
          aria-hidden="true"
        />
        <span className="admin-user-navigation__label">จัดการผู้ใช้งาน</span>
        <ChevronDown
          className="admin-user-navigation__chevron"
          size={17}
          aria-hidden="true"
        />
      </button>

      <div
        id="admin-user-navigation-pages"
        className={`admin-user-navigation__disclosure${expanded ? " is-open" : ""}${collapsed ? " is-icon-only" : ""}`}
        role="group"
        aria-label="หน้าจัดการผู้ใช้งาน"
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="admin-user-navigation__disclosure-inner">
          {userPages.map(({ label, href, icon: Icon }) => {
            const active = isCurrentPage(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={`admin-user-navigation__link portal-sidebar-item${active ? " active" : ""}`}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                title={label}
                onClick={onClose}
              >
                <Icon
                  className="admin-user-navigation__icon portal-sidebar-icon"
                  size={19}
                  strokeWidth={2.15}
                  aria-hidden="true"
                />
                <span className="admin-user-navigation__label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
