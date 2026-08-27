import { startOfDay, isSameDay } from "@/lib/dates";
import { sumMinor } from "@/lib/money";
import { isSpendCategory, type SpendCategory } from "./categories";
import type { Account, Dataset, Institution, Transaction } from "./types";

/**
 * Every figure the product shows is derived here rather than stored, so there
 * is one definition of "cash", "spending" and "net position" and no screen can
 * quietly disagree with another.
 */

export function isCredit(account: Account): boolean {
  return account.type === "credit";
}

export function cashAccounts(dataset: Dataset): Account[] {
  return dataset.accounts.filter((account) => !isCredit(account));
}

export function creditAccounts(dataset: Dataset): Account[] {
  return dataset.accounts.filter(isCredit);
}

export function totalCashMinor(dataset: Dataset): number {
  return sumMinor(cashAccounts(dataset).map((a) => a.currentBalanceMinor));
}

/** Card balances are held positive, so this is what is owed, not a negative. */
export function totalDebtMinor(dataset: Dataset): number {
  return sumMinor(creditAccounts(dataset).map((a) => a.currentBalanceMinor));
}

export function netPositionMinor(dataset: Dataset): number {
  return totalCashMinor(dataset) - totalDebtMinor(dataset);
}

/**
 * Spending excludes transfers and card payments. Both move money between
 * accounts the same person owns: counting them would charge a coffee twice,
 * once on the card and again when the card is paid off.
 */
export function isSpend(transaction: Transaction): boolean {
  return transaction.amountMinor < 0 && isSpendCategory(transaction.category);
}

export function isIncome(transaction: Transaction): boolean {
  return transaction.amountMinor > 0 && transaction.category === "Income";
}

export function pendingTransactions(dataset: Dataset): Transaction[] {
  return dataset.transactions.filter((t) => t.status === "pending");
}

/** Newest first, with pending ahead of posted when they share a timestamp. */
export function sortByRecency(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const byTime = Date.parse(b.occurredAt) - Date.parse(a.occurredAt);
    if (byTime !== 0) return byTime;
    if (a.status === b.status) return 0;
    return a.status === "pending" ? -1 : 1;
  });
}

export function transactionsInMonth(dataset: Dataset, now: Date): Transaction[] {
  return dataset.transactions.filter((transaction) => {
    const at = new Date(transaction.occurredAt);
    return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth();
  });
}

export type MonthSummary = {
  inMinor: number;
  outMinor: number;
  netMinor: number;
  depositCount: number;
  purchaseCount: number;
};

export function summariseMonth(dataset: Dataset, now: Date): MonthSummary {
  const month = transactionsInMonth(dataset, now);
  const income = month.filter(isIncome);
  const spend = month.filter(isSpend);

  const inMinor = sumMinor(income.map((t) => t.amountMinor));
  // Spend amounts are negative; report the magnitude.
  const outMinor = -sumMinor(spend.map((t) => t.amountMinor));

  return {
    inMinor,
    outMinor,
    netMinor: inMinor - outMinor,
    depositCount: income.length,
    purchaseCount: spend.length,
  };
}

export type CategoryTotal = { category: SpendCategory; totalMinor: number };

/** Ranked largest first — the useful order for a labelled bar list. */
export function spendByCategory(dataset: Dataset, now: Date): CategoryTotal[] {
  const totals = new Map<SpendCategory, number>();

  for (const transaction of transactionsInMonth(dataset, now)) {
    if (!isSpend(transaction)) continue;
    const category = transaction.category as SpendCategory;
    totals.set(category, (totals.get(category) ?? 0) - transaction.amountMinor);
  }

  return [...totals.entries()]
    .map(([category, totalMinor]) => ({ category, totalMinor }))
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

/** Pending charges already held against available balance, as a magnitude. */
export function pendingOutflowMinor(dataset: Dataset): number {
  return -sumMinor(
    pendingTransactions(dataset)
      .filter((t) => t.amountMinor < 0)
      .map((t) => t.amountMinor),
  );
}

export type InstitutionGroup = {
  institution: Institution;
  accounts: Account[];
  totalMinor: number;
};

/**
 * Accounts grouped under the institution that holds them, largest holding
 * first, and largest account first within each. The position rail relies on
 * this order: colour identifies the institution, and the ramp step separates
 * accounts inside one.
 */
export function groupByInstitution(
  dataset: Dataset,
  options: { include?: "cash" | "credit" | "all" } = {},
): InstitutionGroup[] {
  const include = options.include ?? "all";

  return dataset.institutions
    .map((institution) => {
      const accounts = dataset.accounts
        .filter((account) => account.institutionId === institution.id)
        .filter((account) =>
          include === "all" ? true : include === "credit" ? isCredit(account) : !isCredit(account),
        )
        .sort((a, b) => b.currentBalanceMinor - a.currentBalanceMinor);

      return {
        institution,
        accounts,
        totalMinor: sumMinor(accounts.map((a) => a.currentBalanceMinor)),
      };
    })
    .filter((group) => group.accounts.length > 0)
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

export type TransactionDay = {
  date: Date;
  transactions: Transaction[];
  netMinor: number;
};

/** Consecutive runs of the same calendar day, for the ledger's day rules. */
export function groupByDay(transactions: readonly Transaction[]): TransactionDay[] {
  const days: TransactionDay[] = [];

  for (const transaction of sortByRecency(transactions)) {
    const at = new Date(transaction.occurredAt);
    const current = days.at(-1);

    if (current && isSameDay(current.date, at)) {
      current.transactions.push(transaction);
      current.netMinor += transaction.amountMinor;
    } else {
      days.push({
        date: startOfDay(at),
        transactions: [transaction],
        netMinor: transaction.amountMinor,
      });
    }
  }

  return days;
}

export function findAccount(dataset: Dataset, accountId: string): Account | undefined {
  return dataset.accounts.find((account) => account.id === accountId);
}

export function findInstitution(dataset: Dataset, institutionId: string): Institution | undefined {
  return dataset.institutions.find((institution) => institution.id === institutionId);
}

/** Fraction of the limit used, 0..1. Null when there is no limit to compare to. */
export function creditUtilisation(account: Account): number | null {
  if (!isCredit(account) || !account.creditLimitMinor) return null;
  return account.currentBalanceMinor / account.creditLimitMinor;
}
