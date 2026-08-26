import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Chip.module.css";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function Chip({ active = false, className, children, ...props }: ChipProps) {
  return (
    <button
      className={[styles.chip, active ? styles.active : "", className].filter(Boolean).join(" ")}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}
