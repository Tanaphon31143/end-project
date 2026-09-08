"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Info,
  ShieldAlert,
  CalendarCheck,
  FileCheck2,
  FileX2,
  AlertTriangle,
} from "lucide-react";
import type { AppNotification } from "@/lib/notifications";

function getNotificationIcon(type: string) {
  switch (type) {
    case "SESSION_OPENED":
      return <CalendarCheck className="notif-type-icon notif-session" size={18} />;
    case "SESSION_EXPIRING":
      return <Clock className="notif-type-icon notif-warning" size={18} />;
    case "REQUEST_APPROVED":
      return <FileCheck2 className="notif-type-icon notif-success" size={18} />;
    case "REQUEST_REJECTED":
      return <FileX2 className="notif-type-icon notif-danger" size={18} />;
    case "ATTENDANCE_LATE":
    case "ATTENDANCE_ABSENT":
    case "ATTENDANCE_ANOMALY":
      return <ShieldAlert className="notif-type-icon notif-danger" size={18} />;
    default:
      return <Info className="notif-type-icon notif-info" size={18} />;
  }
}

function getNotificationTypeBadge(type: string) {
  switch (type) {
    case "SESSION_OPENED":
      return <span className="notif-badge session">เปิดคาบเช็คชื่อ</span>;
    case "SESSION_EXPIRING":
      return <span className="notif-badge expiring">ใกล้หมดเวลา</span>;
    case "REQUEST_APPROVED":
      return <span className="notif-badge approved">อนุมัติคำร้อง</span>;
    case "REQUEST_REJECTED":
      return <span className="notif-badge rejected">ปฏิเสธคำร้อง</span>;
    case "ATTENDANCE_LATE":
      return <span className="notif-badge late">มาสาย</span>;
    case "ATTENDANCE_ABSENT":
      return <span className="notif-badge absent">ขาดเรียน</span>;
    case "ATTENDANCE_ANOMALY":
      return <span className="notif-badge anomaly">ข้อมูลผิดปกติ</span>;
    default:
      return <span className="notif-badge info">แจ้งเตือน</span>;
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/student/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(Number(data.unreadCount) || 0);
      }
    } catch {
      // Ignore background network error
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // Periodic polling
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleMarkRead(id: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      await fetch("/api/student/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore error
    }
  }

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await fetch("/api/student/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  function handleItemClick(notif: AppNotification) {
    if (!notif.isRead) {
      handleMarkRead(notif.id);
    }
    setOpen(false);
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  }

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        className="notification notif-trigger-btn"
        aria-label={`การแจ้งเตือน ${unreadCount > 0 ? `มี ${unreadCount} รายการใหม่` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
      >
        <Bell size={21} />
        {unreadCount > 0 ? (
          <span className="notif-count-badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : (
          <i />
        )}
      </button>

      {open && (
        <div
          className="notif-panel card"
          role="dialog"
          aria-label="แผงการแจ้งเตือน"
        >
          <header className="notif-header">
            <div>
              <strong>การแจ้งเตือน</strong>
              {unreadCount > 0 && (
                <span className="notif-header-unread">{unreadCount} ใหม่</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
                disabled={loading}
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
              >
                <CheckCheck size={16} /> อ่านทั้งหมดแล้ว
              </button>
            )}
          </header>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} />
                <p>ไม่มีการแจ้งเตือนในขณะนี้</p>
                <small>เมื่อมีรอบเช็คชื่อหรือผลคำร้อง ข้อมูลจะปรากฏที่นี่</small>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.isRead ? "is-read" : "is-unread"}`}
                  onClick={() => handleItemClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleItemClick(n);
                    }
                  }}
                >
                  <div className="notif-item-icon">{getNotificationIcon(n.type)}</div>
                  <div className="notif-item-content">
                    <div className="notif-item-top">
                      {getNotificationTypeBadge(n.type)}
                      <span className="notif-time">{n.createdAt}</span>
                    </div>
                    <h4 className="notif-title">{n.title}</h4>
                    <p className="notif-desc">{n.message}</p>
                    {n.actionUrl && (
                      <span className="notif-action-hint">
                        กดเพื่อดูรายละเอียด <ExternalLink size={12} />
                      </span>
                    )}
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      className="notif-item-read-btn"
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                      aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <footer className="notif-footer">
            <button
              type="button"
              className="notif-view-all-link"
              onClick={() => {
                setOpen(false);
                router.push("/student/notifications");
              }}
            >
              ดูประวัติการแจ้งเตือนทั้งหมด
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
