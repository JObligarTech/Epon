import { addDays } from "@/lib/dates";
import { toMinor } from "@/lib/money";
import type { Category } from "./categories";
import type { Account, Dataset, Institution, Transaction } from "./types";

/**
 * Stand-in data until Supabase and Plaid are wired up. Every institution,
 * account and merchant here is invented.
 *
 * Built as a function of "now" rather than a frozen fixture so the ledger keeps
 * showing recent activity, and so nothing reads the clock at module scope —
 * which would give the server and the client different data and tear
 * hydration apart. A server component calls this once and passes the result
 * down, exactly as it will pass real rows later.
 */

const INSTITUTIONS: readonly (Omit<Institution, "lastSyncedAt" | "isSample"> & {
  syncedMinutesAgo: number;
})[] = [
  { id: "ins_northstar", name: "Northstar Bank", hue: "marine", status: "healthy", syncedMinutesAgo: 12 },
  { id: "ins_horizon", name: "Horizon Credit", hue: "mulberry", status: "healthy", syncedMinutesAgo: 12 },
  {
    id: "ins_summit",
    name: "Summit Financial",
    hue: "bronze",
    // Deliberately unhealthy: the reconnect path needs somewhere to live.
    status: "reconnect_required",
    syncedMinutesAgo: 60 * 46,
  },
];

const ACCOUNTS: readonly Account[] = [
  {
    id: "acc_northstar_checking",
    institutionId: "ins_northstar",
    name: "Everyday Checking",
    type: "checking",
    mask: "4417",
    currentBalanceMinor: toMinor(7842.19),
    availableBalanceMinor: toMinor(7689.44),
    creditLimitMinor: null,
    apy: null,
  },
  {
    id: "acc_northstar_savings",
    institutionId: "ins_northstar",
    name: "Reserve Savings",
    type: "savings",
    mask: "8802",
    currentBalanceMinor: toMinor(12430.5),
    availableBalanceMinor: toMinor(12430.5),
    creditLimitMinor: null,
    apy: 4.15,
  },
  {
    id: "acc_horizon_card",
    institutionId: "ins_horizon",
    name: "Horizon Signature",
    type: "credit",
    mask: "3391",
    currentBalanceMinor: toMinor(1284.32),
    availableBalanceMinor: toMinor(6715.68),
    creditLimitMinor: toMinor(8000),
    apy: null,
  },
  {
    id: "acc_summit_checking",
    institutionId: "ins_summit",
    name: "Summit Checking",
    type: "checking",
    mask: "2076",
    currentBalanceMinor: toMinor(2193.74),
    availableBalanceMinor: toMinor(2193.74),
    creditLimitMinor: null,
    apy: null,
  },
];

/** [account, merchant, amount, daysAgo, hour, minute, status, category] */
type Seed = readonly [string, string, number, number, number, number, "pending" | "posted", Category];

const NORTHSTAR = "acc_northstar_checking";
const SAVINGS = "acc_northstar_savings";
const CARD = "acc_horizon_card";
const SUMMIT = "acc_summit_checking";

const TRANSACTIONS: readonly Seed[] = [
  [NORTHSTAR, "Starbucks", -6.45, 0, 8, 12, "pending", "Dining"],
  [CARD, "Uber", -18.3, 0, 7, 41, "pending", "Transport"],
  [NORTHSTAR, "Whole Foods Market", -84.12, 1, 18, 22, "pending", "Groceries"],
  [CARD, "Amazon", -42.87, 1, 11, 3, "pending", "Shopping"],
  [NORTHSTAR, "Target", -127.44, 2, 16, 48, "posted", "Shopping"],
  [CARD, "Chevron", -52.18, 2, 9, 15, "posted", "Transport"],
  [CARD, "Netflix", -22.99, 3, 0, 0, "posted", "Subscriptions"],
  [NORTHSTAR, "Trader Joe's", -63.29, 3, 17, 30, "posted", "Groceries"],
  [CARD, "Sweetgreen", -16.75, 4, 12, 26, "posted", "Dining"],
  [NORTHSTAR, "Pacific Gas & Electric", -142.66, 4, 6, 0, "posted", "Bills"],
  [NORTHSTAR, "Costco Wholesale", -218.93, 5, 14, 9, "posted", "Groceries"],
  [CARD, "Spotify", -11.99, 6, 3, 0, "posted", "Subscriptions"],
  [NORTHSTAR, "Kestrel Design Co.", 3214.88, 6, 0, 1, "posted", "Income"],
  [NORTHSTAR, "Transfer to Reserve Savings", -800, 6, 9, 12, "posted", "Transfer"],
  [SAVINGS, "Transfer from Everyday Checking", 800, 6, 9, 12, "posted", "Transfer"],
  [NORTHSTAR, "Horizon Credit payment", -450, 7, 10, 4, "posted", "Card payment"],
  [CARD, "Payment received — thank you", 450, 7, 10, 4, "posted", "Card payment"],
  [SUMMIT, "Blue Bottle Coffee", -8.5, 8, 8, 37, "posted", "Dining"],
  [CARD, "Delta Air Lines", -284.6, 9, 20, 11, "posted", "Transport"],
  [NORTHSTAR, "CVS Pharmacy", -34.21, 10, 18, 55, "posted", "Health"],
  [NORTHSTAR, "Verizon Wireless", -95, 11, 6, 0, "posted", "Bills"],
  [CARD, "Apple", -9.99, 11, 4, 0, "posted", "Subscriptions"],
  [CARD, "Osteria Vino", -96.4, 12, 20, 42, "posted", "Dining"],
  [SUMMIT, "Safeway", -71.08, 13, 17, 6, "posted", "Groceries"],
  [CARD, "Lyft", -24.15, 14, 23, 18, "posted", "Transport"],
  [SAVINGS, "Interest paid", 4.12, 15, 0, 1, "posted", "Income"],
  [NORTHSTAR, "Home Depot", -88.34, 17, 13, 22, "posted", "Shopping"],
  [CARD, "Equinox", -215, 18, 5, 0, "posted", "Subscriptions"],
  [NORTHSTAR, "Cedar Grove Apartments", -2150, 20, 6, 0, "posted", "Housing"],
  [NORTHSTAR, "Kestrel Design Co.", 3214.88, 20, 0, 1, "posted", "Income"],
];

function seedToTransaction(seed: Seed, index: number, now: Date): Transaction {
  const [accountId, merchantName, amount, daysAgo, hour, minute, status, category] = seed;
  const occurred = addDays(now, -daysAgo);
  occurred.setHours(hour, minute, 0, 0);

  return {
    id: `txn_${String(index + 1).padStart(4, "0")}`,
    accountId,
    merchantName,
    amountMinor: toMinor(amount),
    occurredAt: occurred.toISOString(),
    status,
    category,
  };
}

export function getMockDataset(now: Date): Dataset {
  return {
    institutions: INSTITUTIONS.map(({ syncedMinutesAgo, ...institution }) => ({
      ...institution,
      lastSyncedAt: new Date(now.getTime() - syncedMinutesAgo * 60_000).toISOString(),
      isSample: true,
    })),
    accounts: [...ACCOUNTS],
    transactions: TRANSACTIONS.map((seed, index) => seedToTransaction(seed, index, now)),
  };
}
