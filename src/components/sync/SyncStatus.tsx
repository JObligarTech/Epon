"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { syncTransactions } from "@/lib/plaid/sync-actions";
import styles from "./SyncStatus.module.css";

/**
 * When data last arrived, and a way to ask for more.
 *
 * The label is rendered on the server and handed down as a string. Recomputing
 * relative time on the client would disagree with what the server sent and tear
 * hydration, and this sits in the header of every page.
 */
export function SyncStatus({ label }: { label: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (label === null) return null;

  const run = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await syncTransactions();

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      const changed = result.added + result.updated;
      setMessage(
        changed === 0
          ? "You are up to date"
          : `${changed} new ${changed === 1 ? "transaction" : "transactions"}`,
      );
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      className={[styles.sync, pending ? styles.busy : ""].filter(Boolean).join(" ")}
      onClick={run}
      disabled={pending}
      aria-label={pending ? "Checking for new transactions" : "Check for new transactions"}
    >
      <span className={styles.dot} aria-hidden="true" />
      {/* Announced when it changes, so the outcome is not silent for anyone
          who cannot see the label update. */}
      <span className={styles.label} aria-live="polite">
        {pending ? "Checking for transactions…" : (message ?? `Updated ${label}`)}
      </span>
      <span className={pending ? styles.spin : undefined} aria-hidden="true">
        <Icon name="refresh" size={13} strokeWidth={1.6} />
      </span>
    </button>
  );
}
