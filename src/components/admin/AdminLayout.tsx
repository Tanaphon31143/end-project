"use client";
import { useRef, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useResponsiveOverlay } from "@/components/portal/useResponsiveOverlay";

export function AdminLayout({ children, adminName }: { children: React.ReactNode; adminName: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
  return (
    <div className={`admin-shell ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar
        sidebarRef={sidebarRef}
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
      />
      <div className="admin-main" inert={open}>
        <Header
          menuTriggerRef={menuTriggerRef}
          menuOpen={open}
          adminName={adminName}
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
