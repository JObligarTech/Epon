"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import styles from "./Segmented.module.css";

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * A single-select control: radiogroup, not tablist. These options pick a value,
 * they do not swap panels, and `role="tab"` without a tabpanel is both wrong
 * and an axe violation.
 *
 * Follows the radio group keyboard contract — roving tabindex, so the group is
 * one tab stop, and arrow keys move the selection with wrapping.
 *
 * The sliding indicator is measured rather than assumed: labels differ in width
 * ("All" vs "Pending"), so an equal-width transform would drift.
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
  const optionRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const active = optionRefs.current.get(value);
    if (!active) return;
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    // Webfonts land after first paint and change label widths; the control also
    // reflows on resize. Either would leave the indicator stale.
    const observer = new ResizeObserver(measure);
    const list = listRef.current;
    if (list) observer.observe(list);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [measure]);

  const select = useCallback(
    (next: T) => {
      onChange(next);
      optionRefs.current.get(next)?.focus();
    },
    [onChange],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (delta === 0) return;
    event.preventDefault();

    const index = options.findIndex((option) => option.value === value);
    // Wrapping is the documented radio-group behaviour.
    const next = options[(index + delta + options.length) % options.length];
    select(next.value);
  };

  return (
    <div
      className={styles.seg}
      role="radiogroup"
      aria-label={label}
      ref={listRef}
      onKeyDown={onKeyDown}
    >
      {indicator ? (
        <span
          className={styles.indicator}
          style={{ transform: `translateX(${indicator.left - 2.5}px)`, width: indicator.width }}
          aria-hidden="true"
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex keeps the whole group to one tab stop.
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              if (node) optionRefs.current.set(option.value, node);
              else optionRefs.current.delete(option.value);
            }}
            className={[styles.option, selected ? styles.active : ""].filter(Boolean).join(" ")}
            onClick={() => select(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
