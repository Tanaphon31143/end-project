"use client";
import { useRef, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useResponsiveOverlay } from "@/components/portal/useResponsiveOverlay";
import { usePathname, useRouter } from "next/navigation";
import "./AdminAnnouncementShell.css";
import "./AdminUserManagementShell.css";
import "./AdminHeader.css";
import "./AdminSidebarMotion.css";

export function AdminLayout({ children, adminName }: { children: React.ReactNode; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const announcementMode = pathname === "/admin/announcements";
  const userManagementKind = pathname.startsWith("/admin/users")
    ? "users"
    : pathname.startsWith("/admin/teachers")
      ? "teachers"
      : pathname.startsWith("/admin/students")
        ? "students"
        : null;
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useResponsiveOverlay({
    open,
    onClose: () => setOpen(false),
    containerRef: sidebarRef,
    triggerRef: menuTriggerRef,
    mediaQuery: "(max-width: 1023px)",
    trapFocus: true,
  });
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className={[
        "admin-shell",
        announcementMode && "admin-announcement-shell",
        userManagementKind && "admin-user-management-shell",
        userManagementKind && `admin-user-management-${userManagementKind}`,
        collapsed && "sidebar-is-collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar
        sidebarRef={sidebarRef}
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
        onLogout={() => void logout()}
      />
      <div className="admin-main" inert={open}>
        <Header
          menuTriggerRef={menuTriggerRef}
          menuOpen={open}
          adminName={adminName}
          managementMode={Boolean(userManagementKind)}
          onLogout={() => void logout()}
          onMenu={() => {
            if (window.matchMedia("(max-width: 1023px)").matches) {
              setOpen(true);
              return;
            }
            setCollapsed((value) => !value);
          }}
        />
        {children}
      </div>
    </div>
  );
}
