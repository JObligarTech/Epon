import type { Category } from "@/lib/finance/categories";

/**
 * Plaid's personal finance categories onto the eight this product uses.
 *
 * Plaid ships roughly a hundred detailed categories under sixteen primaries.
 * Collapsing them is the whole point — eight is what a person can hold in
 * their head and what the validated palette can colour distinctly.
 *
 * Detailed is consulted first where the primary would lose something that
 * matters: groceries and dining are both FOOD_AND_DRINK but are not the same
 * question, and rent and utilities are both RENT_AND_UTILITIES but one is
 * housing and the other a bill.
 */
const BY_DETAILED: Record<string, Category> = {
  FOOD_AND_DRINK_GROCERIES: "Groceries",
  RENT_AND_UTILITIES_RENT: "Housing",
  ENTERTAINMENT_TV_AND_MOVIES: "Subscriptions",
  ENTERTAINMENT_MUSIC_AND_AUDIO: "Subscriptions",
  GENERAL_SERVICES_SUBSCRIPTIONS: "Subscriptions",
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: "Card payment",
};

const BY_PRIMARY: Record<string, Category> = {
  INCOME: "Income",
  TRANSFER_IN: "Transfer",
  TRANSFER_OUT: "Transfer",
  // Paying down debt is not spending; grouping it here keeps it out of the
  // spending totals, which is what matters.
  LOAN_PAYMENTS: "Card payment",
  FOOD_AND_DRINK: "Dining",
  GENERAL_MERCHANDISE: "Shopping",
  ENTERTAINMENT: "Shopping",
  HOME_IMPROVEMENT: "Housing",
  RENT_AND_UTILITIES: "Bills",
  BANK_FEES: "Bills",
  GENERAL_SERVICES: "Bills",
  GOVERNMENT_AND_NON_PROFIT: "Bills",
  MEDICAL: "Health",
  PERSONAL_CARE: "Health",
  TRANSPORTATION: "Transport",
  TRAVEL: "Transport",
};

/**
 * Falls back to Shopping rather than throwing. Plaid adds categories over time,
 * and an unrecognised one should land somewhere sensible rather than break a
 * sync — Shopping is the broadest spend bucket, so it is the least wrong guess.
 */
export function categoryFromPlaid(
  primary: string | null | undefined,
  detailed: string | null | undefined,
): Category {
  if (detailed && BY_DETAILED[detailed]) return BY_DETAILED[detailed];
  if (primary && BY_PRIMARY[primary]) return BY_PRIMARY[primary];
  return "Shopping";
}
