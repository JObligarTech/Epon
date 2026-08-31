import { describe, expect, it } from "vitest";
import type { AccountRow, ItemRow, TransactionRow } from "@/lib/supabase/database.types";
import { isSpend } from "./derive";
import { accountFromRow, institutionFromRow, transactionFromRow } from "./mappers";

const item: ItemRow = {
  id: "item-1",
  user_id: "user-1",
  plaid_item_id: "plaid-item-1",
  plaid_institution_id: "ins_1",
  institution_name: "Northstar Bank",
  access_token_encrypted: "ciphertext",
  hue_index: 0,
  status: "healthy",
  sync_cursor: "cursor",
  last_synced_at: "2026-08-25T14:00:00.000Z",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-25T14:00:00.000Z",
};

const account: AccountRow = {
  id: "acc-1",
  user_id: "user-1",
  item_id: "item-1",
  plaid_account_id: "plaid-acc-1",
  name: "Everyday Checking",
  mask: "4417",
  type: "checking",
  current_balance_minor: 784219,
  available_balance_minor: 768944,
  credit_limit_minor: null,
  apy: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-25T14:00:00.000Z",
};

const transaction: TransactionRow = {
  id: "txn-1",
  user_id: "user-1",
  account_id: "acc-1",
  plaid_transaction_id: "plaid-txn-1",
  merchant_name: "Starbucks",
  amount_minor: -645,
  occurred_at: "2026-08-25T08:12:00.000Z",
  status: "pending",
  category: "Dining",
  created_at: "2026-08-25T08:12:00.000Z",
  updated_at: "2026-08-25T08:12:00.000Z",
};

describe("institutionFromRow", () => {
  it("resolves the stored slot to a palette hue", () => {
    expect(institutionFromRow(item).hue).toBe("marine");
    expect(institutionFromRow({ ...item, hue_index: 3 }).hue).toBe("pine");
  });

  it("falls back to creation time when nothing has synced yet", () => {
    // Otherwise a relative-time formatter would be handed null and print
    // something like "56 years ago".
    const fresh = institutionFromRow({ ...item, last_synced_at: null });
    expect(fresh.lastSyncedAt).toBe(item.created_at);
  });

  it("never leaks the access token into the shape screens receive", () => {
    expect(JSON.stringify(institutionFromRow(item))).not.toContain("ciphertext");
  });
});

describe("accountFromRow", () => {
  it("carries balances through as minor units", () => {
    expect(accountFromRow(account).currentBalanceMinor).toBe(784219);
    expect(accountFromRow(account).availableBalanceMinor).toBe(768944);
  });

  it("accepts a bigint that arrives as a string", () => {
    // Postgres bigint exceeds what JSON carries exactly, so drivers often
    // return it as text.
    const row = { ...account, current_balance_minor: "784219" as unknown as number };
    expect(accountFromRow(row).currentBalanceMinor).toBe(784219);
  });

  it("drops a value that is not a whole number rather than letting NaN in", () => {
    const row = { ...account, available_balance_minor: "not a number" as unknown as number };
    expect(accountFromRow(row).availableBalanceMinor).toBeNull();
  });

  it("substitutes a placeholder when no mask was reported", () => {
    expect(accountFromRow({ ...account, mask: null }).mask).toBe("••••");
  });
});

describe("transactionFromRow", () => {
  it("keeps the sign convention: negative is money out", () => {
    const mapped = transactionFromRow(transaction);
    expect(mapped.amountMinor).toBe(-645);
    expect(isSpend(mapped)).toBe(true);
  });

  it("falls back to a neutral category for an unrecognised value", () => {
    // category is a plain text column. One odd row should not blank a ledger,
    // and Transfer affects no spending total.
    const mapped = transactionFromRow({ ...transaction, category: "Yachts" });
    expect(mapped.category).toBe("Transfer");
    expect(isSpend(mapped)).toBe(false);
  });

  it("preserves a known category unchanged", () => {
    expect(transactionFromRow(transaction).category).toBe("Dining");
  });
});
