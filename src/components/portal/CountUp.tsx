"use client";

import { useEffect, useRef, useState } from "react";
import "./CountUp.css";

const NUMBER = /(\d[\d,]*(?:\.\d+)?)/;

function frameText(tokens: string[], progress: number) {
  return tokens
    .map((token, index) => {
      if (index % 2 === 0) return token; // split() puts captured numbers at odd indexes
      const decimals = token.split(".")[1]?.length ?? 0;
      const target = Number(token.replace(/,/g, ""));
      const current = target * progress;
      const grouped = token.includes(",");
      return current.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      });
    })
    .join("");
}

/**
 * Counts every number in `value` up from zero when it scrolls into view ("49", "1,234", "5 / 0", "82.5%").
 * The server renders the final text; screen readers always get the final text.
 */
export function CountUp({ value, duration = 900 }: { value: string | number; duration?: number }) {
  const text = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    const element = ref.current;
    const tokens = text.split(NUMBER);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!element || tokens.length < 2 || reduced || !("IntersectionObserver" in window)) {
      element?.setAttribute("data-ready", "");
      return;
    }

    let frame = 0;
    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        // rAF timestamps can precede `start` slightly; clamp so the first frame never shows "-0".
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        const eased = 1 - (1 - t) ** 3;
        setDisplay(t < 1 ? frameText(tokens, eased) : text);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    setDisplay(frameText(tokens, 0));
    element.setAttribute("data-ready", "");
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      run();
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text, duration]);

  return (
    <span className="portal-count">
      <span ref={ref} className="portal-count-value" aria-hidden="true">{display}</span>
      <span className="portal-count-label">{text}</span>
    </span>
  );
}
