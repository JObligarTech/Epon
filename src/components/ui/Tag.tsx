import type { ReactNode } from "react";
import styles from "./Tag.module.css";

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return <span className={[styles.tag, styles[tone]].join(" ")}>{children}</span>;
}
