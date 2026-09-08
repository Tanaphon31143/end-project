"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  CalendarCheck,
  FileCheck2,
  FileX2,
  ShieldAlert,
  Info,
} from "lucide-react";
import { PageTitle } from "@/components/student/UI";
import type { AppNotification } from "@/lib/notifications";

function getNotificationIcon(type: string) {
  switch (type) {
    case "SESSION_OPENED":
      return <CalendarCheck className="notif-type-icon notif-session" size={20} />;
    case "SESSION_EXPIRING":
      return <Clock className="notif-type-icon notif-warning" size={20} />;
    case "REQUEST_APPROVED":
      return <FileCheck2 className="notif-type-icon notif-success" size={20} />;
    case "REQUEST_REJECTED":
      return <FileX2 className="notif-type-icon notif-danger" size={20} />;
    case "ATTENDANCE_LATE":
    case "ATTENDANCE_ABSENT":
    case "ATTENDANCE_ANOMALY":
      return <ShieldAlert className="notif-type-icon notif-danger" size={20} />;
    default:
      return <Info className="notif-type-icon notif-info" size={20} />;
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
      return <span className="notif-badge info">ทั่วไป</span>;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "sessions" | "requests">(
    "all",
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultLimit = 20;
  const pageFromUrl = Number(searchParams.get("page")) || 1;
  const limitFromUrl = Number(searchParams.get("limit")) || defaultLimit;
  const [page, setPage] = useState(pageFromUrl);
  const [limit] = useState(limitFromUrl);
  const [totalPages, setTotalPages] = useState(1);

  async function loadData(currentPage: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/notifications?limit=${limit}&page=${currentPage}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(Number(data.unreadCount) || 0);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
    } catch {}
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/student/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }

  function handleItemClick(n: AppNotification) {
    if (!n.isRead) {
      handleMarkRead(n.id);
    }
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  }

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "sessions")
      return n.type === "SESSION_OPENED" || n.type === "SESSION_EXPIRING";
    if (filter === "requests")
      return n.type === "REQUEST_APPROVED" || n.type === "REQUEST_REJECTED";
    return true;
  });

  const handlePrev = () => {
    if (page > 1) {
      const newPage = page - 1;
      router.replace(`?page=${newPage}&limit=${limit}`);
      setPage(newPage);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      router.replace(`?page=${newPage}&limit=${limit}`);
      setPage(newPage);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="กล่องข้อความ"
        title="ประวัติการแจ้งเตือน"
        description="ติดตามความเคลื่อนไหวรอบเช็คชื่อ ผลคำร้อง และข้อมูลการเข้าเรียน"
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              className="button secondary"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={18} /> อ่านทั้งหมดแล้ว ({unreadCount})
            </button>
          ) : undefined
        }
      />

      <section className="card notif-page-card">
        <div className="notif-page-toolbar">
          <div className="notif-filters">
            <button
              type="button"
              className={`notif-filter-tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              ทั้งหมด ({notifications.length})
            </button>
            <button
              type="button"
              className={`notif-filter-tab ${filter === "unread" ? "active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              ยังไม่ได้อ่าน ({unreadCount})
            </button>
            <button
              type="button"
              className={`notif-filter-tab ${filter === "sessions" ? "active" : ""}`}
              onClick={() => setFilter("sessions")}
            >
              รอบเช็คชื่อ
            </button>
            <button
              type="button"
              className={`notif-filter-tab ${filter === "requests" ? "active" : ""}`}
              onClick={() => setFilter("requests")}
            >
              ผลคำร้อง
            </button>
          </div>
          <button
            type="button"
            className="button secondary notif-refresh-btn"
            onClick={() => loadData(page)}
            title="รีเฟรช"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> รีเฟรช
          </button>
        </div>

        {/* Pagination controls */}
        <div className="notif-pagination">
          <button
            type="button"
            className="button secondary"
            onClick={handlePrev}
            disabled={page <= 1 || loading}
          >
            หน้าแรก
          </button>
          <span className="notif-page-info">
            หน้า {page} / {totalPages}
          </span>
          <button
            type="button"
            className="button secondary"
            onClick={handleNext}
            disabled={page >= totalPages || loading}
          >
            หน้าถัดไป
          </button>
        </div>

        <div className="notif-page-list">
          {loading ? (
            <div className="notif-page-loading">
              <div className="skeleton-item" />
              <div className="skeleton-item" />
              <div className="skeleton-item" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="notif-empty notif-page-empty">
              <Bell size={48} />
              <h3>ไม่พบรายการแจ้งเตือน</h3>
              <p>
                {filter === "unread"
                  ? "คุณอ่านการแจ้งเตือนครบทุกรายการแล้ว"
                  : "ยังไม่มีรายการแจ้งเตือนในหมวดหมู่นี้"}
              </p>
            </div>
          ) : (
            filtered.map((n) => (
              <article
                key={n.id}
                className={`notif-page-item ${n.isRead ? "is-read" : "is-unread"}`}
                onClick={() => handleItemClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleItemClick(n);
                }}
              >
                <div className="notif-item-icon">{getNotificationIcon(n.type)}</div>
                <div className="notif-page-item-body">
                  <div className="notif-page-item-header">
                    <div className="notif-badges-group">
                      {getNotificationTypeBadge(n.type)}
                      {!n.isRead && <span className="notif-new-dot" />}
                    </div>
                    <time className="notif-time">{n.createdAt}</time>
                  </div>
                  <h3 className="notif-title">{n.title}</h3>
                  <p className="notif-desc">{n.message}</p>
                  {n.actionUrl && (
                    <span className="notif-action-hint">
                      ไปยังหน้าที่เกี่ยวข้อง <ExternalLink size={13} />
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
                    <Check size={16} />
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
