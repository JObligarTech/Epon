import styles from "./UtilisationBar.module.css";

/**
 * Share of a credit limit already used. Hidden from assistive tech: the
 * percentage and the remaining credit are both stated in text beside it, so
 * the bar is a second reading of the same number rather than the only one.
 */
export function UtilisationBar({ used, thick = false }: { used: number; thick?: boolean }) {
  return (
    <span
      className={[styles.track, thick ? styles.thick : ""].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <i className={styles.fill} style={{ width: `${Math.min(100, used * 100)}%` }} />
    </span>
  );
}
