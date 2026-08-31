/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import type { Transaction as PlaidTransaction, RemovedTransaction } from "plaid";
import { amountToMinor, collapsePages, mapTransaction } from "./sync";

function plaidTransaction(overrides: Partial<PlaidTransaction> = {}): PlaidTransaction {
  return {
    transaction_id: "txn-1",
    account_id: "acct-1",
    amount: 6.45,
    date: "2026-08-25",
    name: "SQ *STARBUCKS 0123 SEATTLE WA",
    merchant_name: "Starbucks",
    pending: false,
    personal_finance_category: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_COFFEE",
      confidence_level: "VERY_HIGH",
    },
    ...overrides,
  } as PlaidTransaction;
}

describe("amountToMinor", () => {
  it("flips Plaid's sign so money out is negative", () => {
    // Plaid reports outflow as POSITIVE. If this ever inverts, every total in
    // the product inverts with it.
    expect(amountToMinor(6.45)).toBe(-645);
    expect(amountToMinor(-500)).toBe(50000);
    expect(amountToMinor(0)).toBe(-0);
  });

  it("uses the corrected rounding, not a bare multiply", () => {
    expect(amountToMinor(1.005)).toBe(-101);
  });
});

describe("mapTransaction", () => {
  it("prefers the cleaned merchant name over the raw descriptor", () => {
    // "SQ *STARBUCKS 0123 SEATTLE WA" is not what anyone calls it.
    expect(mapTransaction(plaidTransaction()).merchant_name).toBe("Starbucks");
  });

  it("falls back to the raw name when there is no merchant", () => {
    const mapped = mapTransaction(plaidTransaction({ merchant_name: null }));
    expect(mapped.merchant_name).toBe("SQ *STARBUCKS 0123 SEATTLE WA");
  });

  it("never renders an empty row", () => {
    const mapped = mapTransaction(plaidTransaction({ merchant_name: null, name: "  " }));
    expect(mapped.merchant_name).toBe("Unknown merchant");
  });

  it("carries pending through as a status", () => {
    expect(mapTransaction(plaidTransaction({ pending: true })).status).toBe("pending");
    expect(mapTransaction(plaidTransaction({ pending: false })).status).toBe("posted");
  });

  it("prefers when it happened over when it settled", () => {
    // Someone remembers buying coffee this morning, not when the bank got
    // round to recording it.
    const mapped = mapTransaction(
      plaidTransaction({ date: "2026-08-27", authorized_date: "2026-08-25" }),
    );
    expect(mapped.occurred_at.startsWith("2026-08-25")).toBe(true);
  });

  it("survives an unparseable timestamp rather than storing Invalid Date", () => {
    const mapped = mapTransaction(
      plaidTransaction({ authorized_datetime: "not-a-date", date: "2026-08-25" }),
    );
    expect(Number.isNaN(Date.parse(mapped.occurred_at))) .toBe(false);
  });

  it("maps the category", () => {
    expect(mapTransaction(plaidTransaction()).category).toBe("Dining");
  });
});

const removal = (id: string) => ({ transaction_id: id }) as RemovedTransaction;

describe("collapsePages", () => {
  it("keeps the last cursor, which is the one to resume from", () => {
    const result = collapsePages([
      { added: [], modified: [], removed: [], next_cursor: "first" },
      { added: [], modified: [], removed: [], next_cursor: "second" },
    ]);
    expect(result.cursor).toBe("second");
  });

  it("writes a transaction once, in its final state", () => {
    // Added while pending on one page, modified once posted on the next.
    const result = collapsePages([
      { added: [plaidTransaction({ pending: true })], modified: [], removed: [], next_cursor: "a" },
      {
        added: [],
        modified: [plaidTransaction({ pending: false })],
        removed: [],
        next_cursor: "b",
      },
    ]);

    expect(result.added).toHaveLength(1);
    expect(result.modified).toHaveLength(0);
    expect(result.added[0].status).toBe("posted");
  });

  it("does not insert something that was removed later in the same walk", () => {
    const result = collapsePages([
      { added: [plaidTransaction()], modified: [], removed: [], next_cursor: "a" },
      { added: [], modified: [], removed: [removal("txn-1")], next_cursor: "b" },
    ]);

    expect(result.added).toHaveLength(0);
    expect(result.removedIds).toEqual(["txn-1"]);
  });

  it("deduplicates a transaction repeated across pages", () => {
    const result = collapsePages([
      { added: [plaidTransaction()], modified: [], removed: [], next_cursor: "a" },
      { added: [plaidTransaction({ amount: 9.99 })], modified: [], removed: [], next_cursor: "b" },
    ]);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].amount_minor).toBe(-999);
  });

  it("ignores a removal with no id rather than deleting everything", () => {
    const result = collapsePages([
      {
        added: [plaidTransaction()],
        modified: [],
        removed: [{ transaction_id: null } as unknown as RemovedTransaction],
        next_cursor: "a",
      },
    ]);

    expect(result.removedIds).toEqual([]);
    expect(result.added).toHaveLength(1);
  });

  it("returns an empty cursor for an empty walk rather than undefined", () => {
    expect(collapsePages([]).cursor).toBe("");
  });
});
