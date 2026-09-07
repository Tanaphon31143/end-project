"use client";
import { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`admin-shell ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
        onCollapse={() => setCollapsed((v) => !v)}
      />
      <div className="admin-main">
        <Header onMenu={() => setOpen(true)} />
        {children}
      </div>
    </div>
  );
}
