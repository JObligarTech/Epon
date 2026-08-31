import styles from "./AuthForm.module.css";

/**
 * Errors and notices share one region with aria-live, so a screen reader is
 * told what happened without the focus being yanked out of the form.
 */
export function AuthMessage({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <div aria-live="polite">
      {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}
      {notice ? <p className={`${styles.message} ${styles.notice}`}>{notice}</p> : null}
    </div>
  );
}
