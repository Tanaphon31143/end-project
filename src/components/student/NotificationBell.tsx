"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SharedNotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";
import type { AppNotification } from "@/lib/notifications";

function mapNotification(item: AppNotification): NotificationItem {
  const type: NotificationItem["type"] = item.type === "REQUEST_REJECTED" || item.type === "ATTENDANCE_ABSENT" || item.type === "ATTENDANCE_ANOMALY" ? "error" : item.type === "REQUEST_APPROVED" || item.type === "ATTENDANCE_SUCCESS" || item.type === "ISSUE_RESOLVED" ? "success" : item.type === "SESSION_EXPIRING" || item.type === "ATTENDANCE_LATE" ? "warning" : "info";
  const category: Record<string, string> = { REQUEST_APPROVED: "คำขอรายวิชา", REQUEST_REJECTED: "ปฏิเสธคำร้อง", COURSE_UPDATED: "รายวิชาเปลี่ยนแปลง", ATTENDANCE_SUCCESS: "เช็คชื่อ", ATTENDANCE_ABSENT: "เช็คชื่อ", ATTENDANCE_LATE: "เช็คชื่อ", ATTENDANCE_ANOMALY: "เช็คชื่อ", SESSION_OPENED: "เช็คชื่อ", SESSION_EXPIRING: "เช็คชื่อ", ISSUE_RESOLVED: "ผลคำร้อง" };
  return { id: String(item.id), type, category: category[item.type] ?? "แจ้งเตือน", title: item.title, description: item.message, createdAt: item.createdAt, href: item.actionUrl ?? undefined, read: item.isRead };
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const fetching = useRef(false);
  const pathname = usePathname();

  const fetchNotifications = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const response = await fetch("/api/student/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems((data.notifications ?? []).map(mapNotification));
      setError("");
    } catch {
      setError("โหลดแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchNotifications());
    const interval = window.setInterval(() => { if (!document.hidden) void fetchNotifications(); }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications, pathname]);

  async function mark(id?: string) {
    const previous = items;
    setItems((current) => id ? current.map((item) => item.id === id ? { ...item, read: true } : item) : current.map((item) => ({ ...item, read: true })));
    try {
      const response = await fetch("/api/student/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id: Number(id) } : { markAll: true }) });
      if (!response.ok) throw new Error();
    } catch {
      setItems(previous);
      setError("อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return <><SharedNotificationBell role="student" items={items} onRead={(id) => void mark(id)} onReadAll={() => void mark()} />{error && <span className="shared-notif-live-error" role="status">{error}</span>}</>;
}
