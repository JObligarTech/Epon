import { Icon } from "@/components/icons";
import { initials } from "@/components/finance/MonogramTile";
import { formatFullDate, formatTime } from "@/lib/dates";
import { categoryColorVar } from "@/lib/finance/categories";
import type { Account, Institution, Transaction } from "@/lib/finance/types";
import { formatMoney, MINUS } from "@/lib/money";
import styles from "./TransactionDetail.module.css";

/**
 * What a transaction is doing right now, not just what it cost. The trace is
 * the point: "pending" is a stage in a process, and showing the stages makes
 * the held-back balance on the accounts screen make sense.
 */
export function TransactionDetail({
  transaction,
  account,
  institution,
}: {
  transaction: Transaction;
  account: Account;
  institution: Institution;
}) {
  const pending = transaction.status === "pending";
  const inflow = transaction.amountMinor > 0;
  const occurred = new Date(transaction.occurredAt);
  const colour = categoryColorVar(transaction.category);

  return (
    <div>
      <div className={styles.summary}>
        <span
          className={[styles.glyph, pending ? styles.glyphPending : ""].filter(Boolean).join(" ")}
          style={
            pending
              ? { borderColor: `color-mix(in srgb, ${colour} 45%, var(--surface))` }
              : {
                  background: `color-mix(in srgb, ${colour} 18%, var(--surface))`,
                  borderColor: `color-mix(in srgb, ${colour} 38%, var(--surface))`,
                }
          }
          aria-hidden="true"
        >
          {initials(transaction.merchantName)}
        </span>
        <p className={styles.merchant}>{transaction.merchantName}</p>
        <p className={`num ${styles.amount} ${inflow ? styles.inflow : ""}`}>
          {inflow ? "+" : MINUS}
          {formatMoney(transaction.amountMinor)}
        </p>
        <p className={styles.statusLine}>
          {pending ? (
            <span className={styles.pendingPill}>
              <i className={styles.pendingDot} aria-hidden="true" />
              Pending
            </span>
          ) : (
            <span className={styles.postedPill}>Posted</span>
          )}
        </p>
      </div>

      <ol className={styles.trace}>
        <TraceStep
          done
          title="Authorized"
          note={`${formatFullDate(occurred)} at ${formatTime(occurred)}`}
        />
        <TraceStep
          done
          title={pending ? "Held against available balance" : `Cleared by ${institution.name}`}
          note={
            pending
              ? "Reduces what you can spend today"
              : "No longer affects available balance"
          }
        />
        <TraceStep
          done={!pending}
          title="Posted"
          note={pending ? "Usually 1–3 business days" : formatFullDate(occurred)}
        />
      </ol>

      <dl className={styles.facts}>
        <Fact label="Account">
          {account.name} <span className={`num ${styles.mask}`}>••{account.mask}</span>
        </Fact>
        <Fact label="Institution">{institution.name}</Fact>
        <Fact label="Category">
          <span className={styles.category}>
            <i className={styles.categoryDot} style={{ background: colour }} aria-hidden="true" />
            {transaction.category}
          </span>
        </Fact>
        <Fact label="Date">{formatFullDate(occurred)}</Fact>
        <Fact label="Time">{formatTime(occurred)}</Fact>
        <Fact label="Reference">
          <span className={`num ${styles.reference}`}>{transaction.id.toUpperCase()}</span>
        </Fact>
      </dl>

      <p className={styles.footnote}>
        Notes and category changes arrive with budgeting.
      </p>
    </div>
  );
}

function TraceStep({ done, title, note }: { done: boolean; title: string; note: string }) {
  return (
    <li className={[styles.step, done ? styles.stepDone : styles.stepWaiting].join(" ")}>
      <span className={styles.stepMark} aria-hidden="true">
        {done ? <Icon name="check" size={10} strokeWidth={2.4} /> : null}
      </span>
      <span>
        <span className={styles.stepTitle}>{title}</span>
        <span className={styles.stepNote}>{note}</span>
      </span>
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{children}</dd>
    </div>
  );
}
