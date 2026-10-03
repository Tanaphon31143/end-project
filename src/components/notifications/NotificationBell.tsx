"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, ExternalLink, Info, XCircle } from "lucide-react";

export type NotificationItem = {
  id: string;
  type: "info" | "success" | "error" | "warning";
  category: string;
  title: string;
  description: string;
  createdAt: string;
  href?: string;
  read: boolean;
};

const appearance = {
  info: { box: "shared-notif-info", Icon: Info },
  success: { box: "shared-notif-success", Icon: CheckCircle2 },
  error: { box: "shared-notif-error", Icon: XCircle },
  warning: { box: "shared-notif-warning", Icon: AlertTriangle },
} as const;

export default function NotificationBell({
  role,
  items,
  onRead,
  onReadAll,
}: {
  role: "teacher" | "student";
  items: NotificationItem[];
  onRead?: (id: string) => void;
  onReadAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [ring, setRing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.read).length;
  const previousUnread = useRef(unread);
  const list = useMemo(() => onlyUnread ? items.filter((item) => !item.read) : items, [items, onlyUnread]);

  useEffect(() => {
    const wasUnread = previousUnread.current;
    previousUnread.current = unread;
    if (unread > 0 && (wasUnread === 0 || unread > wasUnread)) {
      setRing(true);
      const timer = window.setTimeout(() => setRing(false), 820);
      return () => window.clearTimeout(timer);
    }
  }, [unread]);

  useEffect(() => {
    function dismiss(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="shared-notif-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`shared-notif-trigger ${ring ? "is-ringing" : ""}`}
        aria-label={`การแจ้งเตือน${unread ? ` มี ${unread} รายการใหม่` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && <span className={`shared-notif-dot ${ring ? "is-pinging" : ""}`} aria-hidden="true" />}
      </button>
      {open && (
        <div ref={panelRef} className="shared-notif-panel" role="dialog" aria-label="การแจ้งเตือน">
          <header className="shared-notif-header">
            <strong>การแจ้งเตือน</strong>
            <button type="button" className="shared-notif-action" onClick={onReadAll} disabled={!unread}>อ่านทั้งหมด</button>
          </header>
          <div className="shared-notif-filters" role="tablist" aria-label="ตัวกรองการแจ้งเตือน">
            <button type="button" role="tab" aria-selected={!onlyUnread} className={onlyUnread ? "" : "active"} onClick={() => setOnlyUnread(false)}>ทั้งหมด</button>
            <button type="button" role="tab" aria-selected={onlyUnread} className={onlyUnread ? "active" : ""} onClick={() => setOnlyUnread(true)}>ยังไม่อ่าน ({unread})</button>
          </div>
          <div className="shared-notif-list">
            {!list.length ? <p className="shared-notif-empty">ไม่มีการแจ้งเตือนใหม่</p> : list.map((item, index) => {
              const { box, Icon } = appearance[item.type];
              const content = (
                <>
                  {!item.read && <span className="shared-notif-unread-dot" aria-hidden="true" />}
                  <span className={`shared-notif-icon ${box}`}><Icon size={18} aria-hidden="true" /></span>
                  <span className="shared-notif-content">
                    <span className="shared-notif-meta"><span className={`shared-notif-category ${box}`}>{item.category}</span><time>{item.createdAt}</time></span>
                    <strong>{item.title}</strong>
                    <span className="shared-notif-description">{item.description}</span>
                    <span className="shared-notif-detail">กดเพื่อดูรายละเอียด <ExternalLink size={12} aria-hidden="true" /></span>
                  </span>
                </>
              );
              return item.href ? <Link key={item.id} href={item.href} className={`shared-notif-item ${item.read ? "is-read" : "is-unread"}`} style={{ "--item-index": index } as React.CSSProperties} onClick={() => { onRead?.(item.id); setOpen(false); }}>{content}</Link> : <button key={item.id} type="button" className={`shared-notif-item ${item.read ? "is-read" : "is-unread"}`} style={{ "--item-index": index } as React.CSSProperties} onClick={() => { onRead?.(item.id); setOpen(false); }}>{content}</button>;
            })}
          </div>
          <Link className="shared-notif-footer" href={`/${role}/notifications`} onClick={() => setOpen(false)}>ดูประวัติการแจ้งเตือนทั้งหมด</Link>
        </div>
      )}
    </div>
  );
}
