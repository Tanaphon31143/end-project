"use client";

import { useEffect, type RefObject } from "react";
import { usePathname } from "next/navigation";

/** Fade only route content, keeping navigation, focus, and page state intact. */
export function usePortalMotion(rootRef: RefObject<HTMLElement | null>) {
  const pathname = usePathname();

  useEffect(() => {
    const root = rootRef.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || preference.matches) return;

    const animations: Animation[] = [];
    const fade = (content: Element | null) => {
      if (!content?.animate) return;
      animations.push(content.animate([{ opacity: 0.55 }, { opacity: 1 }], {
        duration: 200,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      }));
    };

    let current = root.querySelector("main");
    fade(current);

    // A segment with loading.tsx renders its skeleton's <main> first and swaps in the page's
    // own <main> when data arrives; fade that one as well, then stop watching.
    const observer = new MutationObserver(() => {
      const next = root.querySelector("main");
      if (!next || next === current) return;
      current = next;
      fade(next);
      observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
    const stopWatching = window.setTimeout(() => observer.disconnect(), 10_000);

    const stop = () => {
      if (preference.matches) animations.forEach((animation) => animation.cancel());
    };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      window.clearTimeout(stopWatching);
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, [pathname, rootRef]);
}
