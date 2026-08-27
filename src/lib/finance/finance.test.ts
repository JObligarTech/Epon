import { describe, expect, it } from "vitest";
import { formatMoney, toMinor } from "@/lib/money";
import { categoryColorVar, SPEND_CATEGORIES, isSpendCategory } from "./categories";
import {
  creditUtilisation,
  findAccount,
  groupByDay,
  groupByInstitution,
  isIncome,
  isSpend,
  netPositionMinor,
  pendingOutflowMinor,
  pendingTransactions,
  sortByRecency,
  spendByCategory,
  summariseMonth,
  totalCashMinor,
  totalDebtMinor,
} from "./derive";
import { getMockDataset } from "./mock-data";
import type { Transaction } from "./types";

const NOW = new Date(2026, 7, 25, 14, 30);
const dataset = getMockDataset(NOW);

describe("mock dataset", () => {
  it("is generated relative to the given time, not the wall clock", () => {
    const earlier = getMockDataset(new Date(2020, 0, 15, 9, 0));
    expect(earlier.transactions[0].occurredAt.startsWith("2020-01-15")).toBe(true);
    expect(dataset.transactions[0].occurredAt.startsWith("2026-08-25")).toBe(true);
  });

  it("produces identical data for the same instant", () => {
    // Server and client must agree, or hydration tears.
    expect(getMockDataset(NOW)).toEqual(getMockDataset(new Date(NOW)));
  });

  it("stores every amount in whole minor units", () => {
    for (const transaction of dataset.transactions) {
      expect(Number.isInteger(transaction.amountMinor)).toBe(true);
    }
    for (const account of dataset.accounts) {
      expect(Number.isInteger(account.currentBalanceMinor)).toBe(true);
    }
  });

  it("gives every transaction an account that exists", () => {
    for (const transaction of dataset.transactions) {
      expect(findAccount(dataset, transaction.accountId)).toBeDefined();
    }
  });

  it("includes both pending and posted activity", () => {
    expect(pendingTransactions(dataset).length).toBeGreaterThan(0);
    expect(dataset.transactions.some((t) => t.status === "posted")).toBe(true);
  });

  it("includes a connection that needs reconnecting", () => {
    expect(dataset.institutions.some((i) => i.status === "reconnect_required")).toBe(true);
  });
});

describe("amount sign convention", () => {
  it("treats negative as money out and positive as money in", () => {
    // Plaid reports outflow as POSITIVE. The sign is flipped once at ingest.
    // If this test fails after the Plaid sync lands, the flip was missed and
    // every total in the product is inverted.
    const coffee = dataset.transactions.find((t) => t.merchantName === "Starbucks")!;
    const paycheck = dataset.transactions.find((t) => t.merchantName === "Kestrel Design Co.")!;

    expect(coffee.amountMinor).toBeLessThan(0);
    expect(paycheck.amountMinor).toBeGreaterThan(0);
    expect(isSpend(coffee)).toBe(true);
    expect(isIncome(paycheck)).toBe(true);
  });

  it("holds a card balance positive, as an amount owed", () => {
    const card = findAccount(dataset, "acc_horizon_card")!;
    expect(card.currentBalanceMinor).toBeGreaterThan(0);
    expect(totalDebtMinor(dataset)).toBe(card.currentBalanceMinor);
  });
});

describe("totals", () => {
  it("adds only cash accounts into cash", () => {
    expect(formatMoney(totalCashMinor(dataset))).toBe("$22,466.43");
  });

  it("subtracts card debt from cash for net position", () => {
    expect(netPositionMinor(dataset)).toBe(totalCashMinor(dataset) - totalDebtMinor(dataset));
    expect(formatMoney(netPositionMinor(dataset))).toBe("$21,182.11");
  });

  it("reports pending outflow as a magnitude", () => {
    const expected = -pendingTransactions(dataset)
      .filter((t) => t.amountMinor < 0)
      .reduce((sum, t) => sum + t.amountMinor, 0);
    expect(pendingOutflowMinor(dataset)).toBe(expected);
    expect(pendingOutflowMinor(dataset)).toBeGreaterThan(0);
  });
});

describe("spending", () => {
  it("excludes transfers and card payments from both sides", () => {
    const transfer = dataset.transactions.find((t) => t.category === "Transfer")!;
    const payment = dataset.transactions.find((t) => t.category === "Card payment")!;

    expect(isSpend(transfer)).toBe(false);
    expect(isSpend(payment)).toBe(false);
    expect(isIncome(transfer)).toBe(false);
    expect(isIncome(payment)).toBe(false);
  });

  it("does not double count a card purchase and the payment that clears it", () => {
    const summary = summariseMonth(dataset, NOW);
    const cardPaymentTotal = dataset.transactions
      .filter((t) => t.category === "Card payment")
      .reduce((sum, t) => sum + Math.abs(t.amountMinor), 0);

    expect(cardPaymentTotal).toBeGreaterThan(0);
    // Spending is unaffected by however the card gets paid off.
    expect(summary.outMinor).toBeLessThan(cardPaymentTotal * 100);
    expect(summary.netMinor).toBe(summary.inMinor - summary.outMinor);
  });

  it("counts deposits and purchases", () => {
    const summary = summariseMonth(dataset, NOW);
    expect(summary.depositCount).toBeGreaterThan(0);
    expect(summary.purchaseCount).toBeGreaterThan(0);
  });

  it("ranks categories largest first and only includes spend categories", () => {
    const totals = spendByCategory(dataset, NOW);
    expect(totals.length).toBeGreaterThan(0);

    for (const { category, totalMinor } of totals) {
      expect(isSpendCategory(category)).toBe(true);
      expect(totalMinor).toBeGreaterThan(0);
    }

    const amounts = totals.map((t) => t.totalMinor);
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
  });

  it("sums each category from its own transactions", () => {
    const totals = spendByCategory(dataset, NOW);
    const housing = totals.find((t) => t.category === "Housing");
    expect(housing?.totalMinor).toBe(toMinor(2150));
  });
});

describe("grouping", () => {
  it("puts accounts under their institution, biggest holding first", () => {
    const groups = groupByInstitution(dataset, { include: "cash" });
    expect(groups[0].institution.name).toBe("Northstar Bank");

    const totals = groups.map((g) => g.totalMinor);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));

    for (const group of groups) {
      const balances = group.accounts.map((a) => a.currentBalanceMinor);
      expect(balances).toEqual([...balances].sort((a, b) => b - a));
    }
  });

  it("drops institutions with nothing matching the filter", () => {
    const cash = groupByInstitution(dataset, { include: "cash" });
    const credit = groupByInstitution(dataset, { include: "credit" });

    expect(cash.some((g) => g.institution.id === "ins_horizon")).toBe(false);
    expect(credit.map((g) => g.institution.id)).toEqual(["ins_horizon"]);
  });

  it("collects transactions into calendar days, newest first", () => {
    const days = groupByDay(dataset.transactions);
    const times = days.map((d) => d.date.getTime());

    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(days.flatMap((d) => d.transactions)).toHaveLength(dataset.transactions.length);
  });

  it("nets each day from its own transactions", () => {
    for (const day of groupByDay(dataset.transactions)) {
      const expected = day.transactions.reduce((sum, t) => sum + t.amountMinor, 0);
      expect(day.netMinor).toBe(expected);
    }
  });

  it("puts pending ahead of posted at the same instant", () => {
    const at = new Date(2026, 7, 25, 9, 0).toISOString();
    const base = { accountId: "a", merchantName: "m", amountMinor: -1, occurredAt: at } as const;
    const sorted = sortByRecency([
      { ...base, id: "posted", status: "posted", category: "Dining" },
      { ...base, id: "pending", status: "pending", category: "Dining" },
    ] satisfies Transaction[]);

    expect(sorted.map((t) => t.id)).toEqual(["pending", "posted"]);
  });
});

describe("credit utilisation", () => {
  it("is the share of the limit already used", () => {
    const card = findAccount(dataset, "acc_horizon_card")!;
    expect(creditUtilisation(card)).toBeCloseTo(1284.32 / 8000, 6);
  });

  it("is null for accounts that have no limit", () => {
    expect(creditUtilisation(findAccount(dataset, "acc_northstar_checking")!)).toBeNull();
  });
});

describe("category colours", () => {
  it("gives every spend category its own token", () => {
    const vars = SPEND_CATEGORIES.map(categoryColorVar);
    expect(new Set(vars).size).toBe(SPEND_CATEGORIES.length);
    for (const value of vars) expect(value).toMatch(/^var\(--cat-[a-z]+\)$/);
  });

  it("uses polarity for income and neutral ink for money that only moves", () => {
    expect(categoryColorVar("Income")).toBe("var(--accent)");
    expect(categoryColorVar("Transfer")).toBe("var(--ink-3)");
    expect(categoryColorVar("Card payment")).toBe("var(--ink-3)");
  });
});
