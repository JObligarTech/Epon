import { addDays, startOfDay } from "@/lib/dates";
import { CATEGORIES, type Category } from "./categories";
import type { Transaction, TransactionStatus } from "./types";

export const DATE_RANGES = ["7", "30", "90", "all"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export type StatusFilter = "all" | TransactionStatus;

export type Filters = {
  query: string;
  accountId: string | "all";
  category: Category | "all";
  status: StatusFilter;
  range: DateRange;
};

export const DEFAULT_FILTERS: Filters = {
  query: "",
  accountId: "all",
  category: "all",
  status: "all",
  range: "30",
};

export const RANGE_LABELS: Record<DateRange, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  all: "All time",
};

/**
 * The URL is the source of truth for filters, so a filtered view can be linked
 * to, bookmarked, and walked back through with the browser's own back button.
 * Anything unrecognised falls back to the default rather than throwing — these
 * values arrive from a query string, which anyone can edit.
 */
export function filtersFromParams(params: URLSearchParams | Record<string, string | undefined>): Filters {
  const read = (key: string): string | undefined =>
    params instanceof URLSearchParams ? (params.get(key) ?? undefined) : params[key];

  const category = read("category");
  const status = read("status");
  const range = read("range");

  return {
    query: read("q") ?? DEFAULT_FILTERS.query,
    accountId: read("account") ?? DEFAULT_FILTERS.accountId,
    category: isCategory(category) ? category : DEFAULT_FILTERS.category,
    status: status === "pending" || status === "posted" ? status : DEFAULT_FILTERS.status,
    range: isRange(range) ? range : DEFAULT_FILTERS.range,
  };
}

/** Only non-default values are written, so a plain view has a clean URL. */
export function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.accountId !== "all") params.set("account", filters.accountId);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.range !== DEFAULT_FILTERS.range) params.set("range", filters.range);
  return params;
}

export function hasActiveFilters(filters: Filters): boolean {
  return filtersToParams(filters).size > 0;
}

export function applyFilters(
  transactions: readonly Transaction[],
  filters: Filters,
  now: Date,
): Transaction[] {
  const query = filters.query.trim().toLowerCase();
  const cutoff =
    filters.range === "all" ? null : startOfDay(addDays(now, -Number(filters.range)));

  return transactions.filter((transaction) => {
    if (filters.accountId !== "all" && transaction.accountId !== filters.accountId) return false;
    if (filters.category !== "all" && transaction.category !== filters.category) return false;
    if (filters.status !== "all" && transaction.status !== filters.status) return false;
    if (cutoff && new Date(transaction.occurredAt) < cutoff) return false;

    if (query) {
      // Merchant or category — the two things someone actually remembers.
      const haystack = `${transaction.merchantName} ${transaction.category}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

function isCategory(value: string | undefined): value is Category {
  return value !== undefined && (CATEGORIES as readonly string[]).includes(value);
}

function isRange(value: string | undefined): value is DateRange {
  return value !== undefined && (DATE_RANGES as readonly string[]).includes(value);
}
