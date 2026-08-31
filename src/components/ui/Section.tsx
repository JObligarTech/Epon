import type { ReactNode } from "react";
import styles from "./Section.module.css";

/**
 * The recurring container: a hairline surface with a heading and optional
 * trailing action. Deliberately not a shadowed card — the design leans on
 * rules and air rather than stacked boxes.
 */
export function Section({
  title,
  action,
  children,
  flush = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={styles.section} aria-label={title}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  );
}
