import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Button.module.css";

/**
 * A link that looks like a button. Not a Link nested inside a Button — that
 * puts an anchor inside a button element, which is invalid, fails axe's
 * nested-interactive rule, and gives assistive tech two overlapping controls
 * where there is one thing to press.
 */
export function ButtonLink({
  href,
  variant = "ghost",
  block = false,
  children,
}: {
  href: string;
  variant?: "primary" | "ghost" | "quiet";
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[styles.btn, styles[variant], block ? styles.block : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}
