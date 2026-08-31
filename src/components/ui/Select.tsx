"use client";

import type { SelectHTMLAttributes } from "react";
import { Icon } from "@/components/icons";
import styles from "./Select.module.css";

/**
 * A native select, restyled. Native gets keyboard support, mobile's own
 * picker, and screen reader behaviour for free — none of which a custom
 * listbox reliably reproduces.
 */
export function Select({
  label,
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <span className={[styles.wrapper, className].filter(Boolean).join(" ")}>
      <select className={styles.select} aria-label={label} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.chevron} aria-hidden="true">
        <Icon name="chevronDown" size={13} />
      </span>
    </span>
  );
}
