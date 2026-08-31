import { categoryColorVar } from "@/lib/finance/categories";
import type { Account, Institution, Transaction } from "@/lib/finance/types";
import { formatTime } from "@/lib/dates";
import { formatMoney, MINUS } from "@/lib/money";
import { initials } from "./MonogramTile";
import styles from "./TransactionRow.module.css";

export function TransactionRow({
  transaction,
  account,
  institution,
  showTime = false,
  secondary = "account",
  categoryColours = true,
}: {
  transaction: Transaction;
  account: Account;
  institution: Institution;
  showTime?: boolean;
  /** Which name to show after the category — the account, or its institution. */
  secondary?: "account" | "institution";
  categoryColours?: boolean;
}) {
  const pending = transaction.status === "pending";
  const inflow = transaction.amountMinor > 0;
  const colour = categoryColorVar(transaction.category);

  return (
    <div className={styles.row}>
      <span
        className={[styles.glyph, pending ? styles.glyphPending : ""].filter(Boolean).join(" ")}
        style={categoryColours ? glyphTint(colour, pending) : undefined}
        aria-hidden="true"
      >
        {initials(transaction.merchantName)}
      </span>

      <span className={styles.meta}>
        <span className={styles.merchant}>{transaction.merchantName}</span>
        <span className={styles.detail}>
          {categoryColours ? (
            <i className={styles.categoryDot} style={{ background: colour }} aria-hidden="true" />
          ) : null}
          {transaction.category}
          <span className={styles.separator}>·</span>
          {secondary === "account" ? account.name : institution.name}
          {showTime ? (
            <>
              <span className={`${styles.separator} ${styles.timeSeparator}`}>·</span>
              <span className={styles.time}>{formatTime(new Date(transaction.occurredAt))}</span>
            </>
          ) : null}
        </span>
      </span>

      <span className={styles.amountCell}>
        <span
          className={[
            "num",
            styles.amount,
            inflow ? styles.inflow : "",
            pending ? styles.amountPending : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {inflow ? "+" : MINUS}
          {formatMoney(transaction.amountMinor)}
        </span>
        {pending ? (
          <span className={styles.pendingPill}>
            <i className={styles.pendingDot} aria-hidden="true" />
            Pending
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Pending keeps its unfilled, dashed treatment and only takes the category's
 * hue — filling it would erase the one thing that tells pending from posted.
 *
 * The initials stay in ink. The category palette was validated for data marks,
 * which need 3:1 against the surface; as text it would need 4.5:1, and several
 * steps do not clear that — dark Groceries on the dark surface is 2.98:1. The
 * tint and border carry the category perfectly well, and the glyph is
 * decorative anyway: the category is named in the row text beside it.
 */
function glyphTint(colour: string, pending: boolean) {
  if (pending) {
    return { borderColor: `color-mix(in srgb, ${colour} 45%, var(--surface))` };
  }
  return {
    background: `color-mix(in srgb, ${colour} 18%, var(--surface))`,
    borderColor: `color-mix(in srgb, ${colour} 38%, var(--surface))`,
  };
}
