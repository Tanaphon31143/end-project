"use client";

import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";

export function RippleButton({
  className = "",
  onClick,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!event.currentTarget.disabled) {
      const button = event.currentTarget;
      const bounds = button.getBoundingClientRect();
      const size = Math.max(bounds.width, bounds.height) * 2;
      const pointerX = event.clientX ? event.clientX - bounds.left : bounds.width / 2;
      const pointerY = event.clientY ? event.clientY - bounds.top : bounds.height / 2;
      const ripple = document.createElement("span");

      ripple.className = "button-ripple";
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${pointerX - size / 2}px`;
      ripple.style.top = `${pointerY - size / 2}px`;
      button.appendChild(ripple);

      const timer = window.setTimeout(() => {
        ripple.remove();
        timers.current = timers.current.filter((item) => item !== timer);
      }, 600);
      timers.current.push(timer);
    }

    onClick?.(event);
  }

  return (
    <button
      {...props}
      className={`ripple-button ${className}`.trim()}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
