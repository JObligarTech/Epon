/**
 * Eight spend categories, one per slot in the validated categorical palette,
 * in its fixed CVD-safe order. A ninth would need a ninth hue, and no ordering
 * of nine clears the separation gates — so new categories fold into these.
 */
export const SPEND_CATEGORIES = [
  "Dining",
  "Shopping",
  "Transport",
  "Groceries",
  "Bills",
  "Housing",
  "Subscriptions",
  "Health",
] as const;

/**
 * Not spending. Income is polarity rather than identity, and transfers and card
 * payments move money between accounts you already own — counting them as
 * spend would double-count every dollar.
 */
export const NON_SPEND_CATEGORIES = ["Income", "Transfer", "Card payment"] as const;

export const CATEGORIES = [...SPEND_CATEGORIES, ...NON_SPEND_CATEGORIES] as const;

export type SpendCategory = (typeof SPEND_CATEGORIES)[number];
export type Category = (typeof CATEGORIES)[number];

const CATEGORY_TOKENS: Record<SpendCategory, string> = {
  Dining: "--cat-dining",
  Shopping: "--cat-shopping",
  Transport: "--cat-transport",
  Groceries: "--cat-groceries",
  Bills: "--cat-bills",
  Housing: "--cat-housing",
  Subscriptions: "--cat-subs",
  Health: "--cat-health",
};

export function isSpendCategory(category: Category): category is SpendCategory {
  return (SPEND_CATEGORIES as readonly string[]).includes(category);
}

/** A CSS var reference, so the colour still resolves per theme at paint time. */
export function categoryColorVar(category: Category): string {
  if (isSpendCategory(category)) return `var(${CATEGORY_TOKENS[category]})`;
  if (category === "Income") return "var(--accent)";
  return "var(--ink-3)";
}
