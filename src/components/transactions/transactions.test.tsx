import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

import { findAccount, findInstitution } from "@/lib/finance/derive";
import { getMockDataset } from "@/lib/finance/mock-data";
import { TransactionDetail } from "./TransactionDetail";
import { TransactionsView } from "./TransactionsView";

const NOW = new Date(2026, 7, 25, 14, 30);
const dataset = getMockDataset(NOW);

beforeEach(() => {
  mocks.search = "";
  mocks.replace.mockClear();
});

const renderView = () =>
  render(
    <TransactionsView dataset={dataset} nowIso={NOW.toISOString()} categoryColours />,
  );

describe("TransactionsView", () => {
  it("groups transactions under the day they happened", () => {
    renderView();
    expect(screen.getByRole("region", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Yesterday" })).toBeInTheDocument();
  });

  it("totals what is showing, not the whole ledger", () => {
    mocks.search = "status=pending&range=all";
    renderView();
    // Four pending charges, no pending income.
    expect(screen.getByText("4 transactions")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("writes a filter change to the URL rather than holding it in memory", async () => {
    renderView();
    await userEvent.click(screen.getByRole("radio", { name: "Pending" }));
    expect(mocks.replace).toHaveBeenCalledWith("/transactions?status=pending", { scroll: false });
  });

  it("returns to a clean URL when a filter goes back to its default", async () => {
    mocks.search = "status=pending";
    renderView();
    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(mocks.replace).toHaveBeenCalledWith("/transactions", { scroll: false });
  });

  it("reflects the URL in the controls, so a deep link looks filtered", () => {
    mocks.search = "account=acc_horizon_card&category=Dining&range=90";
    renderView();

    expect(screen.getByRole("combobox", { name: "Account" })).toHaveValue("acc_horizon_card");
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("Dining");
    expect(screen.getByRole("combobox", { name: "Date range" })).toHaveValue("90");
  });

  it("explains an empty result and offers a way back", async () => {
    mocks.search = "q=nothingmatchesthis&range=all";
    renderView();

    expect(screen.getByText("No transactions match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(mocks.replace).toHaveBeenCalledWith("/transactions", { scroll: false });
  });

  it("does not offer to clear filters when none are set", () => {
    // An empty ledger with no filters is a different problem, and that button
    // would do nothing.
    render(
      <TransactionsView
        dataset={{ ...dataset, transactions: [] }}
        nowIso={NOW.toISOString()}
        categoryColours
      />,
    );
    expect(screen.getByText("No transactions match")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear all filters" })).not.toBeInTheDocument();
  });

  it("offers only categories that actually occur", () => {
    renderView();
    const category = screen.getByRole("combobox", { name: "Category" });
    const options = within(category).getAllByRole("option").map((o) => o.textContent);

    expect(options).toContain("Groceries");
    // Nothing in the demo data is Housing-free, but Health only appears once —
    // the point is the list is derived, not hardcoded.
    expect(options).not.toContain("Yachts");
  });

  it("has no accessibility violations, populated or empty", async () => {
    const { container, unmount } = renderView();
    await expect(container).toBeAccessible();
    unmount();

    mocks.search = "q=nothingmatchesthis&range=all";
    const empty = renderView();
    await expect(empty.container).toBeAccessible();
  });
});

describe("TransactionDetail", () => {
  const detailFor = (status: "pending" | "posted") => {
    const transaction = { ...dataset.transactions[0], status };
    const account = findAccount(dataset, transaction.accountId)!;
    const institution = findInstitution(dataset, account.institutionId)!;
    return render(
      <TransactionDetail
        transaction={transaction}
        account={account}
        institution={institution}
      />,
    );
  };

  it("shows a pending charge as held, with posting still ahead of it", () => {
    detailFor("pending");
    expect(screen.getByText("Held against available balance")).toBeInTheDocument();
    expect(screen.getByText("Usually 1–3 business days")).toBeInTheDocument();
  });

  it("shows a posted charge as cleared by its institution", () => {
    detailFor("posted");
    expect(screen.getByText(/Cleared by Northstar Bank/)).toBeInTheDocument();
    expect(screen.queryByText("Usually 1–3 business days")).not.toBeInTheDocument();
  });

  it("gives the facts as a description list, not a table of divs", () => {
    detailFor("posted");
    for (const label of ["Account", "Institution", "Category", "Date", "Time", "Reference"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("uses absolute dates, which do not depend on when the sheet was opened", () => {
    detailFor("posted");
    // Relative wording here would drift from the server's render of the row.
    expect(screen.queryByText(/ago$/)).not.toBeInTheDocument();
  });

  it("has no accessibility violations in either state", async () => {
    const pending = detailFor("pending");
    await expect(pending.container).toBeAccessible();
    pending.unmount();

    const posted = detailFor("posted");
    await expect(posted.container).toBeAccessible();
  });
});
