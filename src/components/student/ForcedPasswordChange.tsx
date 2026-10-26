"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import styles from "./ForcedPasswordChange.module.css";

// Shown by the student layout in place of every page while the account still
// uses the password issued by the Excel import.
export default function ForcedPasswordChange({ name }: { name: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.push("/");
      router.refresh();
    } catch {
      setLogoutError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className={`account-profile ${styles.page}`}>
      <div className={styles.panel}>
        <p className={styles.greeting}>สวัสดี {name}</p>
        <PasswordChangeCard role="student" forced />
        <div className={styles.footer}>
          {logoutError && <p role="alert">{logoutError}</p>}
          <button type="button" className={styles.logout} onClick={() => void logout()} disabled={loggingOut}>
            <LogOut size={16} aria-hidden="true" />
            {loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
          </button>
        </div>
      </div>
    </main>
  );
}
