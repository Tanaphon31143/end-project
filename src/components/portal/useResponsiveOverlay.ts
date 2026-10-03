"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useResponsiveOverlay({
  open,
  onClose,
  containerRef,
  triggerRef,
  mediaQuery,
  trapFocus = false,
}: {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  mediaQuery: string;
  trapFocus?: boolean;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia(mediaQuery);
    if (!media.matches) return;

    const body = document.body;
    const trigger = triggerRef.current;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((item) => item.getClientRects().length > 0);

    if (trapFocus) queueMicrotask(() => focusable()[0]?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (!trapFocus || event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleBreakpointChange(event: MediaQueryListEvent) {
      if (!event.matches) closeRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    media.addEventListener("change", handleBreakpointChange);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      media.removeEventListener("change", handleBreakpointChange);
      trigger?.focus();
    };
  }, [containerRef, mediaQuery, open, trapFocus, triggerRef]);
}
