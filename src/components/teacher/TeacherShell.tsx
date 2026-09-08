"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { TeacherIdentity } from "@/lib/teacher-data";
const titles: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  courses: "รายวิชาของฉัน",
  scan: "เช็คชื่อด้วยใบหน้า",
  history: "ประวัติการเข้าเรียน",
  reports: "รายงานการเข้าเรียน",
  profile: "โปรไฟล์",
};
export function TeacherShell({
  children,
  identity,
  notifications: initialNotifications,
}: {
  children: React.ReactNode;
  identity: TeacherIdentity;
  notifications: Array<{
    id: string;
    title: string;
    detail: string;
    href: string;
    isRead: boolean;
    createdAt: string;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notificationError, setNotificationError] = useState("");
  const unread = notifications.filter((item) => !item.isRead).length;
  async function openNotifications() {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next && unread) {
      const previous = notifications;
      setNotificationError("");
      setNotifications((items) =>
        items.map((item) => ({ ...item, isRead: true })),
      );
      try {
        const response = await fetch("/api/teacher/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!response.ok) throw new Error();
      } catch {
        setNotifications(previous);
        setNotificationError("บันทึกสถานะการอ่านไม่สำเร็จ");
      }
    }
  }
  const segment = usePathname().split("/")[2] || "dashboard";
  return (
    <div className={`teacher-app ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <Sidebar
        identity={identity}
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
        onCollapse={() => setCollapsed((value) => !value)}
      />
      <div className="teacher-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="menu-button"
              onClick={() => setOpen(true)}
              aria-label="เปิดเมนู"
            >
              <Menu />
            </button>
            <h1>{titles[segment]}</h1>
          </div>
          <div className="topbar-user">
            <div className="teacher-notification-wrap">
              <button
                className="notification"
                aria-label={`การแจ้งเตือน${unread ? ` ${unread} รายการใหม่` : ""}`}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  void openNotifications();
                }}
              >
                <Bell size={20} />
                {unread > 0 && <i />}
              </button>
              {notificationsOpen && (
                <div className="teacher-notification-menu">
                  <b>การแจ้งเตือน {unread > 0 && `(${unread})`}</b>
                  {notificationError && (
                    <p className="form-message error">{notificationError}</p>
                  )}
                  {notifications.length ? (
                    notifications.map((item) => (
                      <Link
                        className={`teacher-notification-item ${item.isRead ? "" : "unread"}`}
                        href={item.href}
                        key={item.id}
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                        <small>{item.createdAt}</small>
                      </Link>
                    ))
                  ) : (
                    <p>ไม่มีการแจ้งเตือน</p>
                  )}
                  <Link
                    href="/teacher/dashboard"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    ดูรอบเช็คชื่อวันนี้
                  </Link>
                </div>
              )}
            </div>
            <div className="avatar">
              {identity.hasProfileImage ? (
                <Image
                  src="/api/teacher/profile-image"
                  alt="รูปครู"
                  width={40}
                  height={40}
                  unoptimized
                />
              ) : (
                identity.initials
              )}
            </div>
            <div className="user-copy">
              <b>{identity.name}</b>
              <span>{identity.position}</span>
            </div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
