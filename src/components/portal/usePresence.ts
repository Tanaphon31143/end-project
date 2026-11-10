"use client";

import { useEffect, useState } from "react";

/** Keep a closing popover mounted briefly; its caller makes it inert immediately. */
export function usePresence(open: boolean, exitDuration = 160) {
  const [retained, setRetained] = useState(open);

  useEffect(() => {
    if (open && !retained) {
      const frame = requestAnimationFrame(() => setRetained(true));
      return () => cancelAnimationFrame(frame);
    }
    if (!open && retained) {
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : exitDuration;
      const timer = window.setTimeout(() => setRetained(false), duration);
      return () => window.clearTimeout(timer);
    }
  }, [open, retained, exitDuration]);

  return {
    present: open || retained,
    presenceProps: {
      "data-portal-presence": open ? "open" : "closed",
      "aria-hidden": open ? undefined : true,
      inert: !open,
    },
  };
}
