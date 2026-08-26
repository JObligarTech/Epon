import type { IconName } from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Visible, reachable, but the feature itself is not built yet. */
  soon?: boolean;
};

/** Live sections, plus budgeting which has a real screen explaining itself. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/accounts", label: "Accounts", icon: "accounts" },
  { href: "/transactions", label: "Transactions", icon: "transactions" },
  { href: "/budgeting", label: "Budgeting", icon: "budgeting", soon: true },
];

/**
 * Not routes. These exist so the navigation visibly accommodates what is
 * coming without pretending it is here — they render as inert text, never as
 * links or buttons, so nothing announces them as broken controls.
 */
export const PLANNED_SECTIONS: readonly { label: string; icon: IconName }[] = [
  { label: "Goals", icon: "goals" },
  { label: "Debt", icon: "debt" },
  { label: "Recurring", icon: "recurring" },
  { label: "Insights", icon: "insights" },
];

export const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: "settings",
};

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
