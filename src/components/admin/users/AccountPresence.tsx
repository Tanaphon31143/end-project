"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserRole } from "./types";

type PresenceAccount = {
  databaseId: number;
  role?: UserRole;
  status: string;
  isLoggedIn: boolean | number;
};
type PresenceSnapshot = { accounts: { role: UserRole; id: number }[] };
const roles: UserRole[] = ["admin", "teacher", "student"];
const refreshInterval = 15_000;

export function loginStatusLabel(isLoggedIn: boolean) {
  return isLoggedIn ? "กำลังใช้งาน" : "ออกจากระบบแล้ว";
}

export function mergeAccountPresence<T extends PresenceAccount>(accounts: T[], online: ReadonlySet<string> | null, role?: UserRole): T[] {
  return accounts.map(account => ({
    ...account,
    isLoggedIn: account.status === "ACTIVE" && (online === null
      ? Boolean(account.isLoggedIn)
      : online.has(`${role ?? account.role}:${account.databaseId}`)),
  }));
}

export function useAccountPresence<T extends PresenceAccount>(records: T[], role?: UserRole) {
  const [online, setOnline] = useState<Set<string> | null>(null);
  const [isStale, setIsStale] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (!mounted.current || request.current || document.visibilityState === "hidden") return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/admin/presence", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Presence unavailable");
      const data = await response.json() as PresenceSnapshot;
      if (!Array.isArray(data.accounts) || !data.accounts.every(account => roles.includes(account.role) && Number.isSafeInteger(account.id) && account.id > 0)) {
        throw new Error("Invalid presence response");
      }
      if (mounted.current && request.current === controller) {
        setOnline(new Set(data.accounts.map(account => `${account.role}:${account.id}`)));
        setIsStale(false);
      }
    } catch {
      // A failed refresh must never turn previously logged-in accounts into logged-out accounts.
      if (mounted.current && request.current === controller) setIsStale(true);
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // The initial records already include server-verified presence.
    const interval = window.setInterval(() => void refresh(), refreshInterval);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);

  const accounts = useMemo(() => mergeAccountPresence(records, online, role), [records, online, role]);
  return { accounts, isStale, refresh };
}

export function AccountPresenceBadge({ isLoggedIn }: { isLoggedIn: boolean }) {
  return <span className={`um-status${isLoggedIn ? "" : " logged-out"}`}>{loginStatusLabel(isLoggedIn)}</span>;
}

export function AccountPresenceNotice({ isStale, onRetry }: { isStale: boolean; onRetry: () => Promise<void> }) {
  if (!isStale) return null;
  return <p className="um-presence-notice" role="status">อัปเดตสถานะการเข้าสู่ระบบไม่ได้ กำลังแสดงสถานะล่าสุด <button type="button" onClick={() => void onRetry()}>ลองอีกครั้ง</button></p>;
}
