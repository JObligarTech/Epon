import { CATEGORIES, type Category } from "./categories";
import { hueForIndex } from "./hues";
import { SAMPLE_PREFIX } from "./sample";
import type { Account, Institution, Transaction } from "./types";
import type { AccountRow, ItemRow, TransactionRow } from "@/lib/supabase/database.types";

/**
 * Database rows to the shapes the screens already use. Keeping this in one
 * place means swapping mock data for real rows touches nothing above it.
 *
 * A row is data from outside the program, so nothing here trusts it: numeric
 * columns come back as numbers but bigint can arrive as a string over the
 * wire, and category is a plain text column that could hold anything.
 */

export function institutionFromRow(row: ItemRow): Institution {
  return {
    id: row.id,
    name: row.institution_name,
    hue: hueForIndex(row.hue_index),
    status: row.status,
    // A connection that has never synced is shown as of its creation, rather
    // than rendering "never" into a relative-time formatter.
    lastSyncedAt: row.last_synced_at ?? row.created_at,
    isSample: row.plaid_item_id.startsWith(SAMPLE_PREFIX),
  };
}

export function accountFromRow(row: AccountRow): Account {
  return {
    id: row.id,
    institutionId: row.item_id,
    name: row.name,
    type: row.type,
    mask: row.mask ?? "••••",
    currentBalanceMinor: toInteger(row.current_balance_minor) ?? 0,
    availableBalanceMinor: toInteger(row.available_balance_minor),
    creditLimitMinor: toInteger(row.credit_limit_minor),
    apy: row.apy === null ? null : Number(row.apy),
  };
}

export function transactionFromRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    merchantName: row.merchant_name,
    amountMinor: toInteger(row.amount_minor) ?? 0,
    occurredAt: row.occurred_at,
    status: row.status,
    category: toCategory(row.category),
  };
}

/**
 * Postgres bigint exceeds what JSON can carry exactly, so drivers commonly
 * return it as a string. Anything that is not a whole number becomes null
 * rather than silently entering the arithmetic as NaN.
 */
function toInteger(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * category is a text column. An unrecognised value falls back rather than
 * throwing: one odd row should not blank out a whole ledger, and "Transfer" is
 * the neutral bucket that affects no spending total.
 */
function toCategory(value: string): Category {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : "Transfer";
}
