import { describe, expect, it } from "vitest";
import {
  applyFilters,
  DEFAULT_FILTERS,
  filtersFromParams,
  filtersToParams,
  hasActiveFilters,
  type Filters,
} from "./filters";
import { getMockDataset } from "./mock-data";

const NOW = new Date(2026, 7, 25, 14, 30);
const dataset = getMockDataset(NOW);
const all = dataset.transactions;

const withFilters = (overrides: Partial<Filters> = {}): Filters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

describe("reading filters from a query string", () => {
  it("falls back to defaults when nothing is set", () => {
    expect(filtersFromParams(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it("reads every supported parameter", () => {
    const params = new URLSearchParams(
      "q=coffee&account=acc_1&category=Dining&status=pending&range=90",
    );
    expect(filtersFromParams(params)).toEqual({
      query: "coffee",
      accountId: "acc_1",
      category: "Dining",
      status: "pending",
      range: "90",
    });
  });

  it("ignores values that are not real, rather than throwing", () => {
    // These arrive from a query string, which anyone can hand-edit.
    const params = new URLSearchParams("category=Yachts&status=maybe&range=forever");
    expect(filtersFromParams(params)).toEqual(DEFAULT_FILTERS);
  });

  it("accepts a plain object too, which is how a server component receives them", () => {
    expect(filtersFromParams({ status: "posted" }).status).toBe("posted");
  });
});

describe("writing filters back to a query string", () => {
  it("writes nothing for a default view", () => {
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe("");
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it("writes only what differs from the default", () => {
    const params = filtersToParams(withFilters({ status: "pending" }));
    expect(params.toString()).toBe("status=pending");
  });

  it("trims a query and drops it when it is only whitespace", () => {
    expect(filtersToParams(withFilters({ query: "  costco  " })).get("q")).toBe("costco");
    expect(filtersToParams(withFilters({ query: "   " })).has("q")).toBe(false);
  });

  it("round-trips through a query string unchanged", () => {
    const filters = withFilters({ query: "uber", category: "Transport", range: "all" });
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
  });
});

describe("applying filters", () => {
  it("returns everything in range by default", () => {
    const result = applyFilters(all, DEFAULT_FILTERS, NOW);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(all.length);
  });

  it("narrows to a single account", () => {
    const result = applyFilters(all, withFilters({ accountId: "acc_horizon_card", range: "all" }), NOW);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.accountId === "acc_horizon_card")).toBe(true);
  });

  it("narrows to a category", () => {
    const result = applyFilters(all, withFilters({ category: "Groceries", range: "all" }), NOW);
    expect(result.every((t) => t.category === "Groceries")).toBe(true);
  });

  it("narrows to pending or posted", () => {
    expect(
      applyFilters(all, withFilters({ status: "pending", range: "all" }), NOW).every(
        (t) => t.status === "pending",
      ),
    ).toBe(true);
  });

  it("matches a search against merchant or category, case insensitively", () => {
    expect(applyFilters(all, withFilters({ query: "STARBUCKS", range: "all" }), NOW)).toHaveLength(1);
    expect(
      applyFilters(all, withFilters({ query: "groceries", range: "all" }), NOW).length,
    ).toBeGreaterThan(1);
  });

  it("cuts off by date range, inclusive of the whole cutoff day", () => {
    const week = applyFilters(all, withFilters({ range: "7" }), NOW);
    const everything = applyFilters(all, withFilters({ range: "all" }), NOW);

    expect(week.length).toBeLessThan(everything.length);
    for (const transaction of week) {
      const age = (NOW.getTime() - Date.parse(transaction.occurredAt)) / 86_400_000;
      expect(age).toBeLessThanOrEqual(8);
    }
  });

  it("combines filters rather than replacing them", () => {
    const result = applyFilters(
      all,
      withFilters({ accountId: "acc_horizon_card", status: "pending", range: "all" }),
      NOW,
    );
    expect(result.every((t) => t.accountId === "acc_horizon_card" && t.status === "pending")).toBe(
      true,
    );
  });

  it("returns nothing when the combination matches nothing, without erroring", () => {
    const result = applyFilters(
      all,
      withFilters({ query: "definitely not a merchant", range: "all" }),
      NOW,
    );
    expect(result).toEqual([]);
  });
});
