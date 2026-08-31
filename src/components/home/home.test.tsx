import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionList } from "@/components/finance/TransactionList";
import { TransactionRow } from "@/components/finance/TransactionRow";
import {
  creditAccounts,
  groupByInstitution,
  sortByRecency,
  spendByCategory,
  summariseMonth,
  totalCashMinor,
  totalDebtMinor,
} from "@/lib/finance/derive";
import { getMockDataset } from "@/lib/finance/mock-data";
import { MonthSummary } from "./MonthSummary";
import { PositionRail } from "./PositionRail";

const NOW = new Date(2026, 7, 25, 14, 30);
const dataset = getMockDataset(NOW);

function renderRail() {
  return render(
    <PositionRail
      cashGroups={groupByInstitution(dataset, { include: "cash" })}
      creditAccounts={creditAccounts(dataset)}
      totalCashMinor={totalCashMinor(dataset)}
      totalDebtMinor={totalDebtMinor(dataset)}
    />,
  );
}

describe("PositionRail", () => {
  it("names every account and its balance in the legend", () => {
    renderRail();
    for (const account of dataset.accounts) {
      expect(screen.getByText(account.name)).toBeInTheDocument();
    }
    expect(screen.getByText("$12,430.50")).toBeInTheDocument();
    expect(screen.getByText("$1,284.32")).toBeInTheDocument();
  });

  it("groups accounts under the institution that holds them", () => {
    renderRail();
    const northstar = screen.getByText("Northstar Bank").closest("div")!;
    expect(within(northstar).getByText("Reserve Savings")).toBeInTheDocument();
    expect(within(northstar).getByText("Everyday Checking")).toBeInTheDocument();
    expect(within(northstar).queryByText("Summit Checking")).not.toBeInTheDocument();
  });

  it("separates two accounts at one institution with different ramp steps", () => {
    const { container } = renderRail();
    const swatches = [...container.querySelectorAll('[class*="swatch"]')].map(
      (node) => (node as HTMLElement).style.background,
    );
    // Same hue family, different step — that difference is the whole point.
    expect(swatches).toContain("var(--ins-marine)");
    expect(swatches).toContain("var(--ins-marine-2)");
  });

  it("hides the bar from assistive tech, since the legend carries the same data", () => {
    const { container } = renderRail();
    const bars = container.querySelectorAll('[class*="bar"]');
    expect(bars.length).toBeGreaterThan(0);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps a small card balance visible rather than infinitesimal", () => {
    const { container } = render(
      <PositionRail
        cashGroups={groupByInstitution(dataset, { include: "cash" })}
        creditAccounts={creditAccounts(dataset)}
        totalCashMinor={10_000_000}
        totalDebtMinor={100}
      />,
    );
    const groups = [...container.querySelectorAll('[class*="group"]')] as HTMLElement[];
    const debtGroup = groups.find((g) => g.querySelector('[class*="debt"]'))!;
    expect(Number.parseFloat(debtGroup.style.flexGrow)).toBeGreaterThanOrEqual(1.6);
  });

  it("has no accessibility violations", async () => {
    const { container } = renderRail();
    await expect(container).toBeAccessible();
  });
});

describe("MonthSummary", () => {
  const summary = summariseMonth(dataset, NOW);
  const categories = spendByCategory(dataset, NOW);

  const renderSummary = () =>
    render(<MonthSummary monthName="August" summary={summary} categories={categories} />);

  it("shows money in, money out and what was kept", () => {
    renderSummary();
    expect(screen.getByText("Money in")).toBeInTheDocument();
    expect(screen.getByText("Money out")).toBeInTheDocument();
    expect(screen.getByText("Kept")).toBeInTheDocument();
  });

  it("pluralises deposit and purchase counts", () => {
    render(
      <MonthSummary
        monthName="August"
        summary={{ inMinor: 100, outMinor: 50, netMinor: 50, depositCount: 1, purchaseCount: 1 }}
        categories={categories}
      />,
    );
    expect(screen.getByText("1 deposit")).toBeInTheDocument();
    expect(screen.getByText("1 purchase")).toBeInTheDocument();
  });

  it("caps the bar list and folds the tail into one row", () => {
    renderSummary();
    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBeLessThanOrEqual(6);
    if (categories.length > 5) {
      expect(screen.getByText("Everything else")).toBeInTheDocument();
    }
  });

  it("scales bars against the largest category, so the top one is full width", () => {
    const { container } = renderSummary();
    const widths = [...container.querySelectorAll('[class*="fill"]')].map(
      (node) => (node as HTMLElement).style.width,
    );
    expect(widths[0]).toBe("100%");
  });

  it("survives a month with no income without dividing by zero", () => {
    render(
      <MonthSummary
        monthName="August"
        summary={{ inMinor: 0, outMinor: 0, netMinor: 0, depositCount: 0, purchaseCount: 0 }}
        categories={[]}
      />,
    );
    expect(screen.getByText("0% of what came in")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = renderSummary();
    await expect(container).toBeAccessible();
  });
});

describe("TransactionRow", () => {
  const account = dataset.accounts[0];
  const institution = dataset.institutions[0];

  const rowFor = (overrides: Partial<(typeof dataset.transactions)[number]> = {}) => {
    const transaction = { ...dataset.transactions[0], ...overrides };
    return render(
      <TransactionRow transaction={transaction} account={account} institution={institution} />,
    );
  };

  it("marks a pending transaction as pending", () => {
    rowFor({ status: "pending" });
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("says nothing extra for a posted transaction", () => {
    rowFor({ status: "posted" });
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });

  it("signs outflow and inflow differently", () => {
    const { unmount } = rowFor({ amountMinor: -645 });
    expect(screen.getByText(/−\$6\.45/)).toBeInTheDocument();
    unmount();

    rowFor({ amountMinor: 321488 });
    expect(screen.getByText(/\+\$3,214\.88/)).toBeInTheDocument();
  });

  it("hides the merchant glyph, which repeats the name beside it", () => {
    const { container } = rowFor();
    expect(container.querySelector('[class*="glyph"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("has no accessibility violations for either status", async () => {
    const { container, unmount } = rowFor({ status: "pending" });
    await expect(container).toBeAccessible();
    unmount();

    const posted = rowFor({ status: "posted" });
    await expect(posted.container).toBeAccessible();
  });
});

describe("TransactionList", () => {
  it("renders one row per transaction under a named list", () => {
    const recent = sortByRecency(dataset.transactions).slice(0, 5);
    render(<TransactionList transactions={recent} dataset={dataset} label="Recent activity" />);

    const list = screen.getByRole("list", { name: "Recent activity" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  });

  it("skips a transaction whose account is missing rather than half-rendering it", () => {
    const orphan = { ...dataset.transactions[0], id: "txn_orphan", accountId: "acc_gone" };
    render(
      <TransactionList
        transactions={[orphan, dataset.transactions[1]]}
        dataset={dataset}
        label="Recent activity"
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
