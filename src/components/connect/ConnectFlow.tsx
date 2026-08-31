"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { createLinkToken, exchangePublicToken } from "@/lib/plaid/connect-actions";
import styles from "./ConnectFlow.module.css";

type Stage =
  | { name: "intro" }
  | { name: "opening" }
  | { name: "importing" }
  | { name: "done"; institutionName: string; accountCount: number }
  | { name: "error"; message: string };

/**
 * Plaid Link runs in its own window and handles the bank's login itself. The
 * credentials never touch this application, which is the entire reason for
 * using it — E-PON receives a public token afterwards and exchanges it on the
 * server for something it can actually read with.
 */
export function ConnectFlow({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "intro" });
  const [linkToken, setLinkToken] = useState<string | null>(null);

  const onSuccess = useCallback(
    async (publicToken: string | null) => {
      // react-plaid-link types this as nullable; without a token there is
      // nothing to exchange.
      if (!publicToken) {
        setStage({ name: "error", message: "The connection did not complete. Try again." });
        return;
      }

      setStage({ name: "importing" });
      const result = await exchangePublicToken(publicToken);

      if (!result.ok) {
        setStage({ name: "error", message: result.error });
        return;
      }

      setStage({
        name: "done",
        institutionName: result.institutionName,
        accountCount: result.accountCount,
      });
      router.refresh();
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    // Closing Link without finishing is a normal thing to do, not a failure.
    onExit: () =>
      setStage((current) => (current.name === "opening" ? { name: "intro" } : current)),
  });

  // usePlaidLink cannot open until it has a token and has initialised, so this
  // waits for both rather than firing in the same tick as the token arriving.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const start = async () => {
    setStage({ name: "opening" });
    const result = await createLinkToken();

    if ("error" in result) {
      setStage({ name: "error", message: result.error });
      return;
    }

    setLinkToken(result.token);
  };

  if (!enabled) {
    return (
      <div className={styles.body}>
        <span className={styles.glyph} aria-hidden="true">
          <Icon name="bank" size={22} strokeWidth={1.6} />
        </span>
        <p>
          Bank connections are not configured in this environment yet. E-PON is running on sample
          data.
        </p>
      </div>
    );
  }

  if (stage.name === "done") {
    return (
      <div className={styles.body} aria-live="polite">
        <span className={`${styles.glyph} ${styles.glyphDone}`} aria-hidden="true">
          <Icon name="check" size={22} strokeWidth={2.2} />
        </span>
        <h3 className={styles.title}>{stage.institutionName} is connected</h3>
        <p>
          {stage.accountCount} {stage.accountCount === 1 ? "account" : "accounts"} linked.
          Transactions arrive on the next sync.
        </p>
      </div>
    );
  }

  if (stage.name === "importing") {
    return (
      <div className={styles.body} aria-live="polite">
        <span className={styles.glyph} aria-hidden="true">
          <Icon name="bank" size={22} strokeWidth={1.6} />
        </span>
        <h3 className={styles.title}>Bringing your accounts across</h3>
        <p>This takes a few seconds. Keep this open.</p>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <span className={styles.glyph} aria-hidden="true">
        <Icon name="bank" size={22} strokeWidth={1.6} />
      </span>

      {stage.name === "error" ? (
        <p className={styles.error} role="alert">
          {stage.message}
        </p>
      ) : null}

      <h3 className={styles.title}>Link a bank or card</h3>
      <p>
        E-PON reads balances and transactions so your accounts stay current. It cannot move money.
      </p>

      <ul className={styles.points}>
        {[
          "Your bank login is entered with your bank, never with E-PON",
          "Read-only access — payments and transfers are never possible",
          "Disconnect any institution at any time",
        ].map((point) => (
          <li key={point}>
            <span className={styles.tick} aria-hidden="true">
              <Icon name="check" size={14} strokeWidth={2.2} />
            </span>
            {point}
          </li>
        ))}
      </ul>

      <Button variant="primary" block onClick={start} disabled={stage.name === "opening"}>
        {stage.name === "opening" ? "Opening…" : "Continue"}
      </Button>
    </div>
  );
}
