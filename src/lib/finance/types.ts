import type { Category } from "./categories";

/**
 * The shapes the product thinks in. These deliberately match what the Postgres
 * schema and Plaid will supply, so commit-for-commit the mock source can be
 * swapped for real rows without touching a screen.
 *
 * In the real schema every row also carries a user id and is fenced by row
 * level security. That column is absent here only because there is one user.
 */

export type InstitutionHue =
  | "marine"
  | "mulberry"
  | "bronze"
  | "pine"
  | "violet"
  | "teal";

/** Mirrors a Plaid Item's health: healthy, or the login no longer works. */
export type ConnectionStatus = "healthy" | "reconnect_required";

export type Institution = {
  id: string;
  name: string;
  /** Indexes the validated institution palette; not a raw colour. */
  hue: InstitutionHue;
  status: ConnectionStatus;
  /** ISO 8601. When Plaid last gave us data for this connection. */
  lastSyncedAt: string;
};

export type AccountType = "checking" | "savings" | "credit";

export type Account = {
  id: string;
  institutionId: string;
  name: string;
  type: AccountType;
  /** Last four digits only. The full number is never stored. */
  mask: string;
  /**
   * What has actually posted. For a credit card this is the amount owed, held
   * positive — the same convention Plaid uses.
   */
  currentBalanceMinor: number;
  /**
   * Spendable now: current balance less pending charges and holds. For a credit
   * card this is remaining credit. Null when the institution does not report it.
   */
  availableBalanceMinor: number | null;
  creditLimitMinor: number | null;
  /** Annual percentage yield, when the account earns one. */
  apy: number | null;
};

export type TransactionStatus = "pending" | "posted";

export type Transaction = {
  id: string;
  accountId: string;
  merchantName: string;
  /**
   * Negative is money leaving, positive is money arriving.
   *
   * Note this is the opposite of Plaid, which reports outflow as positive. The
   * sign is flipped once at ingest so that every calculation downstream reads
   * the way the words do — a sum of amounts is a net change, not a total to be
   * negated. Whoever writes the Plaid sync must remember to flip it; there is a
   * test pinning this convention.
   */
  amountMinor: number;
  /** ISO 8601. */
  occurredAt: string;
  status: TransactionStatus;
  category: Category;
};

export type Dataset = {
  institutions: Institution[];
  accounts: Account[];
  transactions: Transaction[];
};

export type { Category };
