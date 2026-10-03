"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, Search, UserRound } from "lucide-react";
import { Sidebar } from "./Sidebar";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";
import type { TeacherIdentity } from "@/lib/teacher-data";
import { useResponsiveOverlay } from "@/components/portal/useResponsiveOverlay";
const searchableRoutes = [
  ["แดชบอร์ด", "/teacher/dashboard"],
  ["รายวิชาของฉัน", "/teacher/courses"],
  ["คำขอรายวิชา", "/teacher/subject-requests"],
  ["เช็คชื่อด้วยใบหน้า", "/teacher/scan"],
  ["ประวัติการเข้าเรียน", "/teacher/history"],
  ["รายงาน", "/teacher/reports"],
  ["โปรไฟล์", "/teacher/profile"],
] as const;
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const notificationItems: NotificationItem[] = notifications.map((item) => ({
    id: item.id,
    type: /ปฏิเสธ|ผิดพลาด|ล้มเหลว/i.test(`${item.title} ${item.detail}`) ? "error" : /อนุมัติ|สำเร็จ|เรียบร้อย/i.test(`${item.title} ${item.detail}`) ? "success" : /เตือน|ใกล้|รอ/i.test(`${item.title} ${item.detail}`) ? "warning" : "info",
    category: /เช็คชื่อ|เข้าเรียน/i.test(`${item.title} ${item.detail}`) ? "เช็คชื่อ" : /คำขอ|รายวิชา/i.test(`${item.title} ${item.detail}`) ? "คำขอรายวิชา" : "แจ้งเตือน",
    title: item.title,
    description: item.detail,
    createdAt: item.createdAt,
    href: item.href,
    read: item.isRead,
  }));
  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim().toLocaleLowerCase("th");
    const match = searchableRoutes.find(([label]) =>
      label.toLocaleLowerCase("th").includes(query),
    );
    if (query && match) {
      router.push(match[1]);
      setSearchQuery("");
      setSearchOpen(false);
    }
  }
  const filteredRoutes = searchableRoutes.filter(([label]) =>
    label.toLocaleLowerCase("th").includes(searchQuery.trim().toLocaleLowerCase("th")),
  );
  function chooseSearchRoute(path: (typeof searchableRoutes)[number][1]) {
    router.push(path);
    setSearchQuery("");
    setSearchOpen(false);
  }
  useEffect(() => {
    function dismiss(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
      if (!searchRef.current?.contains(event.target as Node))
        setSearchOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setSearchOpen(false);
        setSearchExpanded(false);
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  async function markNotification(id?: string) {
    const previous = notifications;
    setNotifications((items) => id ? items.map((item) => item.id === id ? { ...item, isRead: true } : item) : items.map((item) => ({ ...item, isRead: true })));
    try {
      const response = await fetch("/api/teacher/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : {}) });
      if (!response.ok) throw new Error();
    } catch {
      setNotifications(previous);
    }
  }
  const pathname = usePathname();
  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
      setProfileOpen(false);
      setSearchOpen(false);
    });
  }, [pathname]);
  useResponsiveOverlay({
    open,
    onClose: () => setOpen(false),
    containerRef: sidebarRef,
    triggerRef: menuTriggerRef,
    mediaQuery: "(max-width: 1023px)",
    trapFocus: true,
  });
  return (
    <div className={`teacher-app ${collapsed ? "sidebar-is-collapsed" : ""}`}>
      <a className="teacher-skip-link" href="#teacher-content">
        ข้ามไปยังเนื้อหา
      </a>
      <Sidebar
        sidebarRef={sidebarRef}
        open={open}
        collapsed={collapsed}
        onClose={() => setOpen(false)}
      />
      <div className="teacher-main" inert={open}>
        <header className="topbar">
          <div className="topbar-title">
            <button
              ref={menuTriggerRef}
              className="menu-button"
              onClick={() => {
                if (window.matchMedia("(max-width: 1023px)").matches) {
                  setOpen(true);
                  return;
                }
                setCollapsed((value) => !value);
              }}
              aria-label="สลับแถบเมนู"
              aria-controls="teacher-navigation"
              aria-expanded={open}
            >
              <Menu size={22} />
            </button>
            <div className="teacher-header-brand">
              <strong>ระบบเช็คชื่อนักเรียน</strong>
              <span>โรงเรียนขุขันธ์</span>
            </div>
          </div>
          <div className="topbar-user">
            <button
              type="button"
              className="teacher-search-toggle"
              aria-label={searchExpanded ? "ปิดช่องค้นหา" : "เปิดช่องค้นหา"}
              aria-expanded={searchExpanded}
              onClick={() => {
                setSearchExpanded((value) => !value);
                queueMicrotask(() => searchInputRef.current?.focus());
              }}
            >
              <Search size={19} />
            </button>
            <form className={`teacher-search ${searchExpanded ? "is-expanded" : ""}`} role="search" onSubmit={submitSearch} ref={searchRef}>
              <Search size={19} aria-hidden="true" />
              <input
                ref={searchInputRef}
                aria-label="ค้นหาเมนู"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="teacher-search-results"
                aria-expanded={searchOpen}
                autoComplete="off"
                placeholder="ค้นหา..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
              />
              {searchOpen && (
                <div className="teacher-search-results" id="teacher-search-results" role="listbox" aria-label="ผลการค้นหาเมนู">
                  {filteredRoutes.length ? (
                    filteredRoutes.map(([label, path]) => (
                      <button type="button" role="option" aria-selected="false" key={path} onClick={() => chooseSearchRoute(path)}>
                        {label}
                      </button>
                    ))
                  ) : (
                    <p>ไม่พบเมนูที่ค้นหา</p>
                  )}
                </div>
              )}
            </form>
            <NotificationBell role="teacher" items={notificationItems} onRead={(id) => void markNotification(id)} onReadAll={() => void markNotification()} />
            <div className="teacher-profile-menu-wrap" ref={profileRef}>
              <button
                className="teacher-profile-trigger"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((value) => !value);
                }}
              >
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
                  <span>ครูผู้สอน</span>
                </div>
                <ChevronDown
                  className="teacher-profile-chevron"
                  size={16}
                  aria-hidden="true"
                />
              </button>
              {profileOpen && (
                <div className="teacher-profile-dropdown" role="menu">
                  <div className="teacher-profile-dropdown-heading">
                    <strong>{identity.name}</strong>
                    <span>ครูผู้สอน · {identity.position}</span>
                  </div>
                  <Link
                    href="/teacher/profile"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserRound size={16} aria-hidden="true" /> ดูโปรไฟล์
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="teacher-content" tabIndex={-1} className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
