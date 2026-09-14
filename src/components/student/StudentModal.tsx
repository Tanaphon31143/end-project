"use client";

import { useEffect, useRef } from "react";

/** Native modal makes the background inert, traps Tab and restores trigger focus. */
export default function StudentModal({ children, label, onClose, busy = false }: {
  children: React.ReactNode; label: string; onClose: () => void; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className="student-native-modal" aria-label={label} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    {children}
  </dialog>;
}
