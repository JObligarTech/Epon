import styles from "./Logo.module.css";

/**
 * A stack built up from a wide base — ipon, to save up.
 * The wordmark wears the mono face (the same one every figure uses) rather
 * than the UI sans, and the hyphen takes the accent so it reads as a
 * deliberate detail instead of dead space.
 */
export function Logo({ size = 20, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <span className={styles.lockup}>
      <svg
        className={styles.mark}
        width={size}
        height={size}
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <rect x="6.5" y="3.2" width="7" height="3.3" rx="1.65" />
        <rect x="4.5" y="8.35" width="11" height="3.3" rx="1.65" />
        <rect x="2.5" y="13.5" width="15" height="3.3" rx="1.65" />
      </svg>
      {showWordmark ? (
        <span className={styles.wordmark}>
          E<span className={styles.hyphen}>-</span>PON
        </span>
      ) : null}
      <span className={styles.srOnly}>E-PON</span>
    </span>
  );
}
