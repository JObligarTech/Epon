"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./Segmented.module.css";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * The sliding indicator is measured rather than assumed: options have different
 * label widths ("All" vs "Pending"), so an equal-width transform would drift.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
    if (!active) return;
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    // Fonts land after first paint and change label widths, and the control
    // reflows on resize; both would otherwise leave the indicator stale.
    const observer = new ResizeObserver(measure);
    if (listRef.current) observer.observe(listRef.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className={styles.seg} role="tablist" aria-label={label} ref={listRef}>
      {indicator ? (
        <span
          className={styles.indicator}
          style={{ transform: `translateX(${indicator.left - 2.5}px)`, width: indicator.width }}
          aria-hidden="true"
        />
      ) : null}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          data-value={option.value}
          className={[styles.option, option.value === value ? styles.active : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
