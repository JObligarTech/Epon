import type { Account } from "@/lib/finance/types";

export function accountTypeLabel(type: Account["type"]): string {
  switch (type) {
    case "credit":
      return "Credit card";
    case "savings":
      return "Savings";
    default:
      return "Checking";
  }
}

/**
 * What "available" means depends on the account, and the difference matters:
 * on a card it is headroom left to borrow, on a chequing account it is what is
 * spendable after pending charges are held back.
 */
export function availableLabel(account: Account): string {
  return account.type === "credit" ? "Available credit" : "Available balance";
}
