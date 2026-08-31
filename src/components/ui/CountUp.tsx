"use client";

import { useEffect, useRef } from "react";
import { formatMoney, formatMoneyRounded } from "@/lib/money";

let hasAnimated = false;

/**
 * Counts a figure up on first paint. The server renders the final value, so
 * this is purely additive — with JavaScript off, or with reduced motion, the
 * number is simply correct from the start.
 *
 * Writes textContent directly rather than holding a frame counter in state:
 * sixty renders a second to animate one string is waste, and it keeps this out
 * of React's update cycle entirely.
 *
 * Formatting happens in here rather than arriving as a prop — a function
 * cannot cross the server/client boundary, so the caller names a variant.
 */
const FORMATTERS = {
  money: formatMoney,
  rounded: formatMoneyRounded,
} as const;

export function CountUp({
  valueMinor,
  variant = "money",
  durationMs = 900,
}: {
  valueMinor: number;
  variant?: keyof typeof FORMATTERS;
  durationMs?: number;
}) {
  const format = FORMATTERS[variant];
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Once per page load. Returning to Home should not replay it.
    if (hasAnimated) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    hasAnimated = true;

    let frame = 0;
    const start = performance.now();

    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs);
      // easeOutExpo: fast to begin, settling rather than braking.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      element.textContent = format(Math.round(valueMinor * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.textContent = format(valueMinor);
    };
  }, [valueMinor, format, durationMs]);

  return <span ref={ref}>{format(valueMinor)}</span>;
}
