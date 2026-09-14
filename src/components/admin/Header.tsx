"use client";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react";

type PendingRequest = {
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

const fieldLabels: Record<string, string> = {
  FULL_NAME: "ชื่อ-นามสกุล",
  STUDENT_CODE: "รหัสนักเรียน",
  GRADE_LEVEL: "ระดับชั้น",
  CLASSROOM: "ห้องเรียน",
  CLASS_NUMBER: "เลขที่",
};

const pageTitles: Record<string, [string, string]> = {
  "/admin/dashboard": ["แดชบอร์ดผู้ดูแลระบบ", "ระบบเช็คชื่อด้วยการสแกนใบหน้า"],
  "/admin/users": ["จัดการผู้ใช้งาน", "จัดการสิทธิ์และบัญชีผู้ใช้งานในระบบ"],
  "/admin/students": ["ข้อมูลนักเรียน", "จัดการทะเบียนและข้อมูลนักเรียน"],
  "/admin/teachers": ["ข้อมูลครู", "จัดการข้อมูลครูและรายวิชาที่รับผิดชอบ"],
  "/admin/subjects": ["รายวิชา", "จัดการรายวิชาและครูผู้สอน"],
  "/admin/classes": ["ชั้นเรียน", "จัดการห้องเรียนและรายชื่อนักเรียน"],
  "/admin/faces": ["ข้อมูลใบหน้า", "จัดการข้อมูลอ้างอิงสำหรับการตรวจจับใบหน้า"],
  "/admin/attendance/check-in": [
    "เช็คชื่อด้วยใบหน้า",
    "ตรวจจับและบันทึกเวลาเข้าเรียนแบบเรียลไทม์",
  ],
  "/admin/attendance": [
    "ข้อมูลการเข้าเรียน",
    "ตรวจสอบและจัดการประวัติการเข้าเรียน",
  ],
  "/admin/reports": [
    "รายงานและสถิติ",
    "วิเคราะห์ภาพรวมการเข้าเรียนของโรงเรียน",
  ],
  "/admin/settings": ["ตั้งค่าระบบ", "กำหนดค่าการทำงานของระบบเช็คชื่อ"],
};

export function Header({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationError, setNotificationError] = useState("");
  const notificationRef = useRef<HTMLDivElement>(null);
  const selectedRequest = requests.find((item) => item.id === selectedId);

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
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  const [title, subtitle] =
    pageTitles[pathname] ?? pageTitles["/admin/dashboard"];
  return (
    <header className="admin-header">
      <div className="header-title-wrap">
        <button className="mobile-menu" onClick={onMenu} aria-label="เปิดเมนู">
          <Menu />
        </button>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="header-actions">
        <label className="search-box">
          <span className="sr-only">ค้นหา</span>
          <input placeholder="ค้นหา..." />
          <Search size={19} />
        </label>
        <div className="admin-notification-wrap" ref={notificationRef}>
          <button
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
            <Bell size={20} />
            {pendingCount > 0 && <span>{pendingCount > 99 ? "99+" : pendingCount}</span>}
          </button>
          {notificationsOpen && (
            <div className="admin-notification-panel" id="admin-notification-panel" aria-label="การแจ้งเตือนของผู้ดูแลระบบ">
              <div className="admin-notification-heading">
                <div>
                  <strong>การแจ้งเตือน</strong>
                  <small>คำร้องแก้ไขข้อมูลที่รอตรวจสอบ {pendingCount} รายการ</small>
                </div>
                <button type="button" aria-label="ปิดการแจ้งเตือน" onClick={() => setNotificationsOpen(false)}><X size={18} /></button>
              </div>
              {notificationError && <p className="admin-notification-error" role="alert">{notificationError} <button type="button" onClick={() => void loadNotifications()}>ลองใหม่</button></p>}
              {loading ? (
                <p className="admin-notification-empty" role="status">กำลังโหลดการแจ้งเตือน...</p>
              ) : selectedRequest ? (
                <div className="admin-notification-detail">
                  <button type="button" className="admin-notification-back" onClick={() => setSelectedId(null)}>← กลับไปยังรายการ</button>
                  <h2>รายละเอียดคำร้อง #{selectedRequest.id}</h2>
                  <p className="admin-notification-date">{selectedRequest.createdAt}</p>
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
                </div>
              ) : requests.length ? (
                <div className="admin-notification-list">
                  {requests.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedId(item.id)}>
                      <strong>{item.studentName}</strong>
                      <span>ขอแก้ไข{fieldLabels[item.fieldType] || item.fieldType}</span>
                      <small>{item.createdAt} · ดูรายละเอียด</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="admin-notification-empty">ไม่มีคำร้องที่รอตรวจสอบ</p>
              )}
            </div>
          )}
        </div>
        <div className="admin-profile-wrap">
          <button
            className="profile"
            onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); }}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="profile-avatar">ผด</span>
            <span className="profile-copy">
              <b>ผู้ดูแลระบบ</b>
              <small>ผู้ดูแลสูงสุด</small>
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
