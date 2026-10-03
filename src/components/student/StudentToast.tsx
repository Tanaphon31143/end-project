"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Toast = { message: string; kind: "success" | "error" };
const ToastContext = createContext<
  (message: string, kind?: Toast["kind"]) => void
>(() => {});
export const useStudentToast = () => useContext(ToastContext);

export function StudentToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback(
    (message: string, kind: Toast["kind"] = "success") =>
      setToast({ message, kind }),
    [],
  );
  useEffect(() => {
    if (!toast || toast.kind === "error") return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        className="student-toast-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className={`student-toast ${toast.kind}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="ปิดข้อความแจ้งผล"
              onClick={() => setToast(null)}
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
