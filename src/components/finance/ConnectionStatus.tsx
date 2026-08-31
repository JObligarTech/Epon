import type { ConnectionStatus as Status } from "@/lib/finance/types";
import styles from "./ConnectionStatus.module.css";

/**
 * Connection health in one line. The dot repeats what the words say, so it is
 * decorative — state is never carried by colour alone here.
 */
export function ConnectionStatus({
  status,
  syncLabel,
}: {
  status: Status;
  /** Pre-formatted on the server: relative time computed on the client would
   *  disagree with the server's render and tear hydration. */
  syncLabel: string;
}) {
  const needsAttention = status === "reconnect_required";

  return (
    <span className={[styles.status, needsAttention ? styles.warn : ""].filter(Boolean).join(" ")}>
      <i className={styles.dot} aria-hidden="true" />
      {needsAttention ? "Needs reconnecting" : `Connected · updated ${syncLabel}`}
    </span>
  );
}
