import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ pathname: "/", refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh, replace: vi.fn(), push: vi.fn() }),
}));

// The connect sheet reaches Plaid, which has no place in a component test.
vi.mock("@/lib/plaid/connect-actions", () => ({
  createLinkToken: vi.fn(async () => ({ token: "link-sandbox-test" })),
  exchangePublicToken: vi.fn(async () => ({
    ok: true,
    institutionName: "Northstar Bank",
    accountCount: 2,
  })),
}));

import { AppShell } from "./AppShell";
import { NavRail } from "./NavRail";
import { TabBar } from "./TabBar";

beforeEach(() => {
  mocks.pathname = "/";
});

/**
 * jsdom renders at 1024px wide, so the desktop rail is visible and the mobile
 * tab bar is display:none. Testing Library ignores hidden elements, which is
 * correct — only one navigation is ever exposed at a time. Tab bar assertions
 * therefore opt into hidden queries and dispatch events directly.
 */

describe("NavRail", () => {
  it("lists the primary sections as links", () => {
    render(<NavRail />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const label of ["Home", "Accounts", "Transactions", "Budgeting", "Settings"]) {
      expect(within(nav).getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it("marks only the current section with aria-current", () => {
    mocks.pathname = "/accounts";
    render(<NavRail />);
    expect(screen.getByRole("link", { name: /Accounts/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Home/ })).not.toHaveAttribute("aria-current");
  });

  it("does not treat Home as active on a deeper route", () => {
    mocks.pathname = "/transactions";
    render(<NavRail />);
    expect(screen.getByRole("link", { name: /Home/ })).not.toHaveAttribute("aria-current");
  });

  it("keeps planned sections out of the tab order and out of the control tree", async () => {
    render(<NavRail />);
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(screen.getByText("Goals")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Goals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Goals" })).not.toBeInTheDocument();
  });

  it("discloses planned sections and reports the expanded state", async () => {
    render(<NavRail />);
    const disclosure = screen.getByRole("button", { name: "Show" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");

    // Collapsed by default. The hidden attribute has to actually hide it — a
    // layout class on the list will out-specify the UA rule otherwise.
    expect(screen.queryByText("Goals")).not.toBeVisible();

    await userEvent.click(disclosure);
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Insights")).toBeVisible();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<NavRail />);
    await expect(container).toBeAccessible();
  });
});

describe("TabBar", () => {
  it("is not exposed at desktop width, where the rail is the navigation", () => {
    render(<TabBar onConnect={() => {}} onMore={() => {}} moreOpen={false} />);
    expect(screen.queryByRole("navigation", { name: "Sections" })).not.toBeInTheDocument();
  });

  it("wires its connect and more controls", () => {
    const onConnect = vi.fn();
    const onMore = vi.fn();
    render(<TabBar onConnect={onConnect} onMore={onMore} moreOpen={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Connect/, hidden: true }));
    fireEvent.click(screen.getByRole("button", { name: /More/, hidden: true }));

    expect(onConnect).toHaveBeenCalledOnce();
    expect(onMore).toHaveBeenCalledOnce();
  });

  it("declares that More opens a dialog and reports its state", () => {
    render(<TabBar onConnect={() => {}} onMore={() => {}} moreOpen />);
    const more = screen.getByRole("button", { name: /More/, hidden: true });
    expect(more).toHaveAttribute("aria-haspopup", "dialog");
    expect(more).toHaveAttribute("aria-expanded", "true");
  });
});

describe("AppShell", () => {
  const renderShell = () =>
    render(
      <AppShell plaidEnabled={false}>
        <h2>Overview</h2>
      </AppShell>,
    );

  it("exposes a skip link and exactly one main landmark", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("opens the connect sheet from the top bar", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));
    expect(screen.getByRole("dialog", { name: "Connect an account" })).toBeInTheDocument();
  });

  it("marks the page behind an open sheet as inert", async () => {
    const { container } = renderShell();
    const shell = container.querySelector("main")!.closest("[inert], div")!.parentElement!;

    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));
    expect(shell).toHaveAttribute("inert");
  });

  it("closes the sheet on Escape and restores focus to the trigger", async () => {
    renderShell();
    const trigger = screen.getByRole("button", { name: /Connect/ });

    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("has no accessibility violations, closed or with a sheet open", async () => {
    const { container } = renderShell();
    await expect(container).toBeAccessible();

    await userEvent.click(screen.getByRole("button", { name: /Connect/ }));
    await expect(container).toBeAccessible();
  });
});
