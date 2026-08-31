import "server-only";

import type { RemovedTransaction, Transaction as PlaidTransaction } from "plaid";
import { toMinor } from "@/lib/money";
import { categoryFromPlaid } from "./categories";

/**
 * Plaid reports money leaving an account as POSITIVE. This product uses the
 * opposite, so a sum of amounts reads as a net change rather than a total
 * needing negation.
 *
 * The flip happens exactly here, once, on the way in. Everything downstream
 * assumes it has already happened, and there is a test in the finance layer
 * pinning the convention — if that test ever fails, this is the line to look at.
 */
export function amountToMinor(plaidAmount: number): number {
  return -toMinor(plaidAmount);
}

export type MappedTransaction = {
  plaid_transaction_id: string;
  plaid_account_id: string;
  merchant_name: string;
  amount_minor: number;
  occurred_at: string;
  status: "pending" | "posted";
  category: string;
};

/**
 * Plaid gives several names of varying quality. merchant_name is the cleaned
 * one ("Starbucks"); name is the raw descriptor ("SQ *STARBUCKS 0123 SEATTLE").
 * Prefer the readable one, fall back rather than showing an empty row.
 */
function merchantFor(transaction: PlaidTransaction): string {
  return transaction.merchant_name?.trim() || transaction.name?.trim() || "Unknown merchant";
}

/**
 * authorized_date is when it happened; date is when it settled. For a pending
 * charge the first is what a person recognises — they remember buying coffee
 * this morning, not when the bank got round to it.
 */
function occurredAt(transaction: PlaidTransaction): string {
  const stamp =
    transaction.authorized_datetime ??
    transaction.datetime ??
    transaction.authorized_date ??
    transaction.date;

  const parsed = new Date(stamp);
  return Number.isNaN(parsed.getTime()) ? new Date(transaction.date).toISOString() : parsed.toISOString();
}

export function mapTransaction(transaction: PlaidTransaction): MappedTransaction {
  return {
    plaid_transaction_id: transaction.transaction_id,
    plaid_account_id: transaction.account_id,
    merchant_name: merchantFor(transaction),
    amount_minor: amountToMinor(transaction.amount),
    occurred_at: occurredAt(transaction),
    status: transaction.pending ? "pending" : "posted",
    category: categoryFromPlaid(
      transaction.personal_finance_category?.primary,
      transaction.personal_finance_category?.detailed,
    ),
  };
}

export type SyncChanges = {
  added: MappedTransaction[];
  modified: MappedTransaction[];
  removedIds: string[];
  cursor: string;
};

/**
 * Collapses the pages of a /transactions/sync walk into one set of changes.
 *
 * A transaction can appear in more than one page — added while pending, then
 * modified once it posts — so later entries win. Writing them in arrival order
 * instead would leave a posted transaction looking pending again.
 */
export function collapsePages(
  pages: {
    added: PlaidTransaction[];
    modified: PlaidTransaction[];
    removed: RemovedTransaction[];
    next_cursor: string;
  }[],
): SyncChanges {
  const added = new Map<string, MappedTransaction>();
  const modified = new Map<string, MappedTransaction>();
  const removedIds = new Set<string>();

  for (const page of pages) {
    for (const transaction of page.added) {
      added.set(transaction.transaction_id, mapTransaction(transaction));
    }
    for (const transaction of page.modified) {
      const mapped = mapTransaction(transaction);
      // Something added earlier in the same walk should be written once, in
      // its final state, rather than inserted and then updated.
      if (added.has(mapped.plaid_transaction_id)) added.set(mapped.plaid_transaction_id, mapped);
      else modified.set(mapped.plaid_transaction_id, mapped);
    }
    for (const removal of page.removed) {
      if (!removal.transaction_id) continue;
      removedIds.add(removal.transaction_id);
      added.delete(removal.transaction_id);
      modified.delete(removal.transaction_id);
    }
  }

  return {
    added: [...added.values()],
    modified: [...modified.values()],
    removedIds: [...removedIds],
    cursor: pages.at(-1)?.next_cursor ?? "",
  };
}
