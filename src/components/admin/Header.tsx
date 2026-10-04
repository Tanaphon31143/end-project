"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useResponsiveOverlay } from "@/components/portal/useResponsiveOverlay";
import {
  Bell,
  Check,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Maximize2,
  Menu,
  Search,
  X,
  XCircle,
} from "lucide-react";

type ProfileEditRequest = {
  kind: "PROFILE_EDIT";
  id: number;
  studentName: string;
  studentCode: string;
  fieldType: string;
  oldValue: string;
  newValue: string;
  reason: string;
  attachmentName: string | null;
  hasAttachment: boolean;
  createdAt: string;
};

type SubjectRequest = {
  kind: "SUBJECT_REQUEST";
  id: number;
  teacherName: string;
  subjectName: string;
  subjectCode: string;
  classroomName: string;
  semester: number;
  academicYear: string;
  createdAt: string;
};

type PendingRequest = ProfileEditRequest | SubjectRequest;

const fieldLabels: Record<string, string> = {
  FULL_NAME: "ชื่อ-นามสกุล",
  STUDENT_CODE: "รหัสนักเรียน",
  GRADE_LEVEL: "ระดับชั้น",
  CLASSROOM: "ห้องเรียน",
  CLASS_NUMBER: "เลขที่",
};

export function Header({
  onMenu,
  adminName,
  menuTriggerRef,
  menuOpen,
}: {
  onMenu: () => void;
  adminName: string;
  menuTriggerRef: RefObject<HTMLButtonElement | null>;
  menuOpen: boolean;
}) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [bellPulse, setBellPulse] = useState(0);
  const previousPendingCount = useRef(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationError, setNotificationError] = useState("");
  const [notificationNotice, setNotificationNotice] = useState("");
  const [requestAction, setRequestAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestActionBusy, setRequestActionBusy] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedRequest = requests.find(
    (item) => `${item.kind}:${item.id}` === selectedKey,
  );

  const loadNotifications = useCallback(async () => {
    setNotificationError("");
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load notifications");
      const data = (await response.json()) as {
        requests: PendingRequest[];
        pendingCount: number;
      };
      setRequests(data.requests);
      if (data.pendingCount > previousPendingCount.current) {
        setBellPulse((value) => value + 1);
      }
      previousPendingCount.current = data.pendingCount;
      setPendingCount(data.pendingCount);
    } catch {
      setNotificationError("โหลดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadNotifications());
    const interval = window.setInterval(() => {
      if (!document.hidden) void loadNotifications();
    }, 60000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
        notificationTriggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  useResponsiveOverlay({
    open: notificationsOpen,
    onClose: () => setNotificationsOpen(false),
    containerRef: notificationPanelRef,
    triggerRef: notificationTriggerRef,
    mediaQuery: "(max-width: 639px)",
  });
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  async function reviewProfileRequest(action: "APPROVE" | "REJECT") {
    if (!selectedRequest || selectedRequest.kind !== "PROFILE_EDIT") return;
    if (action === "REJECT" && !rejectionReason.trim()) {
      setNotificationError("กรุณาระบุเหตุผลที่ปฏิเสธคำร้อง");
      return;
    }

    setNotificationError("");
    setNotificationNotice("");
    setRequestActionBusy(true);
    try {
      const response = await fetch("/api/admin/profile-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action,
          rejectionReason: action === "REJECT" ? rejectionReason.trim() : undefined,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "ดำเนินการกับคำร้องไม่สำเร็จ");
      }

      setSelectedKey(null);
      setRequestAction(null);
      setRejectionReason("");
      setNotificationNotice(
        data.message ||
          (action === "APPROVE" ? "อนุมัติคำร้องเรียบร้อยแล้ว" : "ปฏิเสธคำร้องเรียบร้อยแล้ว"),
      );
      await loadNotifications();
      router.refresh();
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : "ดำเนินการกับคำร้องไม่สำเร็จ",
      );
    } finally {
      setRequestActionBusy(false);
    }
  }
  return (
    <header className="admin-header">
      <div className="header-title-wrap">
        <button
          ref={menuTriggerRef}
          className="mobile-menu"
          onClick={onMenu}
          aria-label="สลับแถบเมนู"
          aria-controls="admin-navigation"
          aria-expanded={menuOpen}
        >
          <Menu size={22} />
        </button>
        <div className="admin-header-brand">
          <strong>ระบบเช็คชื่อนักเรียน</strong>
          <span>โรงเรียนขุขันธ์</span>
        </div>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="admin-search-toggle"
          aria-label={searchOpen ? "ปิดช่องค้นหา" : "เปิดช่องค้นหา"}
          aria-expanded={searchOpen}
          onClick={() => {
            setSearchOpen((value) => !value);
            queueMicrotask(() => searchInputRef.current?.focus());
          }}
        >
          <Search size={19} />
        </button>
        <label className={`search-box ${searchOpen ? "is-open" : ""}`}>
          <span className="sr-only">ค้นหา</span>
          <Search size={19} />
          <input ref={searchInputRef} placeholder="ค้นหานักเรียน, ครู, รายวิชา, ชั้นเรียน..." />
          <kbd>Ctrl K</kbd>
        </label>
        <div className="admin-notification-wrap" ref={notificationRef}>
          <button
            ref={notificationTriggerRef}
            type="button"
            className="bell"
            aria-label={`การแจ้งเตือน ${pendingCount} รายการที่รอตรวจสอบ`}
            aria-expanded={notificationsOpen}
            aria-controls="admin-notification-panel"
            onClick={() => {
              setNotificationsOpen((value) => !value);
              setProfileOpen(false);
              if (!notificationsOpen) void loadNotifications();
            }}
          >
            <Bell key={`bell-${bellPulse}`} className={bellPulse ? "admin-bell-ring" : undefined} size={20} aria-hidden="true" />
            {pendingCount > 0 && <span key={`badge-${bellPulse}`} className={bellPulse ? "admin-bell-ping" : undefined} aria-hidden="true">{pendingCount > 99 ? "99+" : pendingCount}</span>}
          </button>
          <button
            type="button"
            className={`notification-sheet-backdrop ${notificationsOpen ? "is-open" : ""}`}
            aria-label="ปิดการแจ้งเตือน"
            onClick={() => setNotificationsOpen(false)}
          />
            <div
              ref={notificationPanelRef}
              className={`admin-notification-panel notification-surface ${notificationsOpen ? "is-open" : ""}`}
              id="admin-notification-panel"
              role="dialog"
              aria-modal={notificationsOpen ? "true" : undefined}
              aria-label="การแจ้งเตือนของผู้ดูแลระบบ"
              inert={!notificationsOpen}
            >
              <span className="notification-sheet-handle" aria-hidden="true" />
              <div className="admin-notification-heading">
                <div>
                  <strong>การแจ้งเตือน</strong>
                  <small>คำร้องที่รอตรวจสอบ {pendingCount} รายการ</small>
                </div>
                <button type="button" aria-label="ปิดการแจ้งเตือน" onClick={() => setNotificationsOpen(false)}><X size={18} /></button>
              </div>
              {notificationError && <p className="admin-notification-error" role="alert">{notificationError}</p>}
              {notificationNotice && <p className="admin-notification-notice" role="status">{notificationNotice}</p>}
              {loading ? (
                <p className="admin-notification-empty" role="status">กำลังโหลดการแจ้งเตือน...</p>
              ) : selectedRequest ? (
                <div className="admin-notification-detail">
                  <button type="button" className="admin-notification-back" onClick={() => setSelectedKey(null)}>← กลับไปยังรายการ</button>
                  <h2>{selectedRequest.kind === "SUBJECT_REQUEST" ? "รายละเอียดคำขอเปิดรายวิชา" : "รายละเอียดคำร้องแก้ไขข้อมูล"} #{selectedRequest.id}</h2>
                  <p className="admin-notification-date">{selectedRequest.createdAt}</p>
                  {selectedRequest.kind === "SUBJECT_REQUEST" ? (
                    <>
                      <dl>
                        <div><dt>ครูผู้ส่งคำขอ</dt><dd>{selectedRequest.teacherName}</dd></div>
                        <div><dt>รายวิชา</dt><dd>{selectedRequest.subjectCode} {selectedRequest.subjectName}</dd></div>
                        <div><dt>ห้องเรียน</dt><dd>{selectedRequest.classroomName}</dd></div>
                        <div><dt>ภาคเรียน</dt><dd>{selectedRequest.semester}/{selectedRequest.academicYear}</dd></div>
                      </dl>
                      <Link href="/admin/subjects" onClick={() => setNotificationsOpen(false)}>ไปยังหน้าตรวจสอบคำขอ</Link>
                    </>
                  ) : (
                    <>
                      <dl>
                        <div><dt>นักเรียน</dt><dd>{selectedRequest.studentName} ({selectedRequest.studentCode})</dd></div>
                        <div><dt>ข้อมูลที่ขอแก้ไข</dt><dd>{fieldLabels[selectedRequest.fieldType] || selectedRequest.fieldType}</dd></div>
                        <div><dt>ข้อมูลเดิม</dt><dd>{selectedRequest.oldValue}</dd></div>
                        <div><dt>ข้อมูลใหม่</dt><dd>{selectedRequest.newValue}</dd></div>
                        <div><dt>เหตุผล</dt><dd>{selectedRequest.reason}</dd></div>
                      </dl>
                      {selectedRequest.hasAttachment && (
                        <a href={`/api/attachments/profile-request/${selectedRequest.id}`} target="_blank" rel="noopener noreferrer">
                          ดูไฟล์แนบ{selectedRequest.attachmentName ? `: ${selectedRequest.attachmentName}` : ""}
                        </a>
                      )}
                      <div className="admin-notification-review">
                        {requestAction === "REJECT" && (
                          <label>
                            <span>เหตุผลที่ปฏิเสธ</span>
                            <textarea
                              value={rejectionReason}
                              onChange={(event) => setRejectionReason(event.target.value)}
                              placeholder="ระบุสิ่งที่นักเรียนต้องแก้ไขก่อนส่งคำร้องใหม่"
                              disabled={requestActionBusy}
                              autoFocus
                            />
                          </label>
                        )}
                        <div className="admin-notification-review-actions">
                          {requestAction === "REJECT" ? (
                            <>
                              <button
                                type="button"
                                className="secondary"
                                disabled={requestActionBusy}
                                onClick={() => {
                                  setRequestAction(null);
                                  setRejectionReason("");
                                  setNotificationError("");
                                }}
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                className="danger"
                                disabled={requestActionBusy}
                                onClick={() => void reviewProfileRequest("REJECT")}
                              >
                                <XCircle size={16} />
                                {requestActionBusy ? "กำลังบันทึก..." : "ยืนยันการปฏิเสธ"}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="danger secondary"
                                disabled={requestActionBusy}
                                onClick={() => {
                                  setRequestAction("REJECT");
                                  setNotificationError("");
                                }}
                              >
                                <XCircle size={16} /> ปฏิเสธ
                              </button>
                              <button
                                type="button"
                                className="primary"
                                disabled={requestActionBusy}
                                onClick={() => void reviewProfileRequest("APPROVE")}
                              >
                                <Check size={16} />
                                {requestActionBusy ? "กำลังบันทึก..." : "อนุมัติคำร้อง"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : requests.length ? (
                <div className="admin-notification-list">
                  {requests.map((item) => (
                    <button key={`${item.kind}:${item.id}`} type="button" onClick={() => {
                      setSelectedKey(`${item.kind}:${item.id}`);
                      setRequestAction(null);
                      setRejectionReason("");
                      setNotificationError("");
                      setNotificationNotice("");
                    }}>
                      <strong>{item.kind === "SUBJECT_REQUEST" ? item.subjectName : item.studentName}</strong>
                      <span>{item.kind === "SUBJECT_REQUEST" ? `${item.teacherName} ขอเปิดรายวิชา ${item.subjectCode}` : `ขอแก้ไข${fieldLabels[item.fieldType] || item.fieldType}`}</span>
                      <small>{item.createdAt} · ดูรายละเอียด</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="admin-notification-empty">ไม่มีคำร้องที่รอตรวจสอบ</p>
              )}
            </div>
        </div>
        <button type="button" className="fullscreen-control" aria-label="แสดงผลเต็มหน้าจอ" onClick={() => void toggleFullscreen()}>
          <Maximize2 size={19} />
        </button>
        <div className="admin-profile-wrap">
          <button
            className="profile"
            onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="profile-avatar">AD</span>
            <span className="profile-copy">
              <b>{adminName}</b>
              <small>Administrator</small>
            </span>
            <ChevronDown className={profileOpen ? "rotated" : ""} size={17} />
          </button>
          {profileOpen && (
            <div className="admin-profile-menu" role="menu">
              <Link
                href="/admin/settings"
                onClick={() => setProfileOpen(false)}
              >
                <CircleUserRound size={18} /> ข้อมูลส่วนตัว
              </Link>
              <button onClick={logout}>
                <LogOut size={18} /> ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
