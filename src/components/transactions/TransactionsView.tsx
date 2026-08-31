"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Icon } from "@/components/icons";
import { TransactionList } from "@/components/finance/TransactionList";
import { Button, Chip, Input, Segmented, Select } from "@/components/ui";
import { formatDayLabel } from "@/lib/dates";
import { CATEGORIES } from "@/lib/finance/categories";
import { groupByDay } from "@/lib/finance/derive";
import {
  applyFilters,
  DATE_RANGES,
  DEFAULT_FILTERS,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  RANGE_LABELS,
  type Filters,
  type StatusFilter,
} from "@/lib/finance/filters";
import type { Dataset } from "@/lib/finance/types";
import { formatMoney, MINUS, sumMinor } from "@/lib/money";
import styles from "./TransactionsView.module.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "posted", label: "Posted" },
] as const;

export function TransactionsView({
  dataset,
  nowIso,
  categoryColours,
}: {
  dataset: Dataset;
  /** The server's clock, so day labels match what it rendered. */
  nowIso: string;
  categoryColours: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useMemo(() => new Date(nowIso), [nowIso]);

  // The URL is the source of truth, so a filtered view can be linked to and
  // the back button walks through filter changes like any other navigation.
  const filters = filtersFromParams(new URLSearchParams(searchParams.toString()));

  const update = (patch: Partial<Filters>) => {
    const next = filtersToParams({ ...filters, ...patch }).toString();
    router.replace(next ? `/transactions?${next}` : "/transactions", { scroll: false });
  };

  const matched = applyFilters(dataset.transactions, filters, now);
  const days = groupByDay(matched);
  const outMinor = -sumMinor(matched.filter((t) => t.amountMinor < 0).map((t) => t.amountMinor));
  const inMinor = sumMinor(matched.filter((t) => t.amountMinor > 0).map((t) => t.amountMinor));

  const usedCategories = CATEGORIES.filter((category) =>
    dataset.transactions.some((transaction) => transaction.category === category),
  );

  return (
    <>
      <header className={styles.header}>
        <span className="eyebrow">
          {matched.length} {matched.length === 1 ? "transaction" : "transactions"}
        </span>
        <div className={styles.totals}>
          <span>
            <span className={`num ${styles.total}`}>{formatMoney(outMinor)}</span>
            <span className={styles.totalLabel}>out</span>
          </span>
          <span>
            <span className={`num ${styles.total} ${styles.in}`}>{formatMoney(inMinor)}</span>
            <span className={styles.totalLabel}>in</span>
          </span>
        </div>
      </header>

      <div className={styles.panel}>
        <div className={styles.filters}>
          <span className={styles.search}>
            <span className={styles.searchIcon} aria-hidden="true">
              <Icon name="search" size={14} />
            </span>
            <Input
              className={styles.searchInput}
              type="search"
              aria-label="Search transactions"
              placeholder="Search merchant or category"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
            />
          </span>

          <Segmented
            label="Status"
            value={filters.status}
            onChange={(status) => update({ status: status as StatusFilter })}
            options={STATUS_OPTIONS}
          />

          <Select
            label="Account"
            value={filters.accountId}
            onChange={(event) => update({ accountId: event.target.value })}
            options={[
              { value: "all", label: "All accounts" },
              ...dataset.accounts.map((account) => ({
                value: account.id,
                label: account.name,
              })),
            ]}
          />

          <Select
            label="Category"
            value={filters.category}
            onChange={(event) => update({ category: event.target.value as Filters["category"] })}
            options={[
              { value: "all", label: "All categories" },
              ...usedCategories.map((category) => ({ value: category, label: category })),
            ]}
          />

          <Chip
            active={categoryColours}
            onClick={() => router.replace(toggleColoursHref(searchParams, categoryColours))}
          >
            <span className={styles.chipDots} aria-hidden="true">
              <i style={{ background: swatch(categoryColours, "--cat-groceries") }} />
              <i style={{ background: swatch(categoryColours, "--cat-dining") }} />
              <i style={{ background: swatch(categoryColours, "--cat-transport") }} />
            </span>
            Category colours
          </Chip>

          <Select
            label="Date range"
            value={filters.range}
            onChange={(event) => update({ range: event.target.value as Filters["range"] })}
            options={DATE_RANGES.map((range) => ({ value: range, label: RANGE_LABELS[range] }))}
          />
        </div>

        {days.length > 0 ? (
          days.map((day) => (
            <section key={day.date.toISOString()} aria-label={formatDayLabel(day.date, now)}>
              <h2 className={styles.dayRule}>
                <span className={styles.dayLabel}>{formatDayLabel(day.date, now)}</span>
                <span className={styles.dayLine} aria-hidden="true" />
                <span className={`num ${styles.dayTotal}`}>
                  {day.netMinor >= 0 ? "+" : MINUS}
                  {formatMoney(day.netMinor)}
                </span>
              </h2>
              <TransactionList
                transactions={day.transactions}
                dataset={dataset}
                showTime
                label={formatDayLabel(day.date, now)}
              />
            </section>
          ))
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <Icon name="search" size={26} strokeWidth={1.4} />
            </span>
            <p className={styles.emptyTitle}>No transactions match</p>
            <p className={styles.emptyBody}>
              Try widening the date range, or clear the filters to start again.
            </p>
            {hasActiveFilters(filters) ? (
              <Button onClick={() => update(DEFAULT_FILTERS)}>Clear all filters</Button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

function swatch(on: boolean, token: string): string {
  // Off shows the same three dots in ink, so the control reads as a switch
  // rather than disappearing.
  return on ? `var(${token})` : "var(--ink-3)";
}

function toggleColoursHref(params: ReadonlyURLSearchParamsLike, on: boolean): string {
  const next = new URLSearchParams(params.toString());
  if (on) next.set("plain", "1");
  else next.delete("plain");
  const query = next.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

type ReadonlyURLSearchParamsLike = { toString(): string };
