import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import styles from "./Fallback.module.css";

/**
 * One shape for every dead end — a thrown error, a missing account, a bad URL.
 * Says what happened in words a person can act on, and always offers a way
 * onwards rather than leaving them stranded.
 */
export function Fallback({
  icon = "warn",
  title,
  body,
  children,
  reference,
}: {
  icon?: IconName;
  title: string;
  body: string;
  children?: ReactNode;
  /** Error digest, for matching a report against server logs. */
  reference?: string;
}) {
  return (
    <div className={styles.fallback}>
      <span className={styles.glyph} aria-hidden="true">
        <Icon name={icon} size={22} strokeWidth={1.6} />
      </span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
      {reference ? (
        <p className={styles.reference}>
          Reference <span className="num">{reference}</span>
        </p>
      ) : null}
    </div>
  );
}
