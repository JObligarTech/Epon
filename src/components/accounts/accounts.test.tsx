import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConnectionStatus } from "@/components/finance/ConnectionStatus";
import { groupByInstitution } from "@/lib/finance/derive";
import { getMockDataset } from "@/lib/finance/mock-data";
import { accountTypeLabel, availableLabel } from "./accountLabels";
import { AccountsView, type InstitutionCard } from "./AccountsView";
import { UtilisationBar } from "./UtilisationBar";

const NOW = new Date(2026, 7, 25, 14, 30);
const dataset = getMockDataset(NOW);

const cards: InstitutionCard[] = groupByInstitution(dataset).map((group) => ({
  institution: group.institution,
  accounts: group.accounts,
  syncLabel: "12 minutes ago",
}));

describe("account labels", () => {
  it("names each account type the way a person would", () => {
    expect(accountTypeLabel("credit")).toBe("Credit card");
    expect(accountTypeLabel("savings")).toBe("Savings");
    expect(accountTypeLabel("checking")).toBe("Checking");
  });

  it("distinguishes available credit from available balance", () => {
    // On a card "available" is headroom left to borrow; on a chequing account
    // it is what is spendable after holds. Same word, different meaning.
    const card = dataset.accounts.find((a) => a.type === "credit")!;
    const cash = dataset.accounts.find((a) => a.type === "checking")!;
    expect(availableLabel(card)).toBe("Available credit");
    expect(availableLabel(cash)).toBe("Available balance");
  });
});

describe("ConnectionStatus", () => {
  it("states health in words, not only colour", () => {
    render(<ConnectionStatus status="healthy" syncLabel="12 minutes ago" />);
    expect(screen.getByText(/Connected · updated 12 minutes ago/)).toBeInTheDocument();
  });

  it("says plainly when a connection has stopped working", () => {
    render(<ConnectionStatus status="reconnect_required" syncLabel="2 days ago" />);
    expect(screen.getByText("Needs reconnecting")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ConnectionStatus status="reconnect_required" syncLabel="2 days ago" />,
    );
    await expect(container).toBeAccessible();
  });
});

describe("UtilisationBar", () => {
  it("fills to the share used", () => {
    const { container } = render(<UtilisationBar used={0.25} />);
    expect((container.querySelector('[class*="fill"]') as HTMLElement).style.width).toBe("25%");
  });

  it("never overflows its track when over the limit", () => {
    const { container } = render(<UtilisationBar used={1.4} />);
    expect((container.querySelector('[class*="fill"]') as HTMLElement).style.width).toBe("100%");
  });

  it("is hidden from assistive tech, since the numbers are stated in text", () => {
    const { container } = render(<UtilisationBar used={0.25} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("AccountsView", () => {
  it("groups every account under the institution that holds it", () => {
    render(<AccountsView cards={cards} />);

    const northstar = screen.getByRole("region", { name: "Northstar Bank" });
    expect(within(northstar).getByRole("link", { name: /Everyday Checking/ })).toBeInTheDocument();
    expect(within(northstar).getByRole("link", { name: /Reserve Savings/ })).toBeInTheDocument();
    expect(within(northstar).queryByRole("link", { name: /Summit Checking/ })).not.toBeInTheDocument();
  });

  it("links each account to its own page", () => {
    render(<AccountsView cards={cards} />);
    expect(screen.getByRole("link", { name: /Reserve Savings/ })).toHaveAttribute(
      "href",
      "/accounts/acc_northstar_savings",
    );
  });

  it("describes a card by credit left and a cash account by what is available", () => {
    render(<AccountsView cards={cards} />);
    expect(screen.getByText(/\$6,716 credit left · 16% used/)).toBeInTheDocument();
    expect(screen.getByText("$7,689 available")).toBeInTheDocument();
  });

  it("offers reconnect only on the connection that needs it", () => {
    render(<AccountsView cards={cards} />);
    expect(screen.getAllByRole("button", { name: "Reconnect" })).toHaveLength(1);

    const summit = screen.getByRole("region", { name: "Summit Financial" });
    expect(within(summit).getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
  });

  it("explains reconnecting in a dialog naming the institution", async () => {
    render(<AccountsView cards={cards} />);
    await userEvent.click(screen.getByRole("button", { name: "Reconnect" }));

    const dialog = screen.getByRole("dialog", { name: "Reconnect" });
    expect(within(dialog).getByText(/Summit Financial/)).toBeInTheDocument();
  });

  it("shows the APY when an account earns one, and not otherwise", () => {
    render(<AccountsView cards={cards} />);
    expect(screen.getByText(/4\.15% APY/)).toBeInTheDocument();
    expect(screen.queryAllByText(/APY/)).toHaveLength(1);
  });

  it("has no accessibility violations, with the reconnect dialog open or closed", async () => {
    const { container } = render(<AccountsView cards={cards} />);
    await expect(container).toBeAccessible();

    await userEvent.click(screen.getByRole("button", { name: "Reconnect" }));
    await expect(container).toBeAccessible();
  });
});
