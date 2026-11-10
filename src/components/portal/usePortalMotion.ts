"use client";

import { useEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";

/** Fade only route content, keeping navigation, focus, and page state intact. */
export function usePortalMotion(rootRef: RefObject<HTMLElement | null>) {
  const pathname = usePathname();

  useEffect(() => {
    const content = rootRef.current?.querySelector("main");
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!content || !content.animate || preference.matches) return;

    const animation = content.animate([{ opacity: 0.55 }, { opacity: 1 }], {
      duration: 200,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
    const stop = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener("change", stop);
    return () => {
      animation.cancel();
      preference.removeEventListener("change", stop);
    };
  }, [pathname, rootRef]);
}
