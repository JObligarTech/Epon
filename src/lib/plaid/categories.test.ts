import { describe, expect, it } from "vitest";
import { SPEND_CATEGORIES } from "@/lib/finance/categories";
import { categoryFromPlaid } from "./categories";

describe("categoryFromPlaid", () => {
  it("splits food and drink by whether it was groceries", () => {
    // Both are FOOD_AND_DRINK to Plaid, but "am I eating out too much" and
    // "what do I spend on food at home" are different questions.
    expect(categoryFromPlaid("FOOD_AND_DRINK", "FOOD_AND_DRINK_GROCERIES")).toBe("Groceries");
    expect(categoryFromPlaid("FOOD_AND_DRINK", "FOOD_AND_DRINK_RESTAURANT")).toBe("Dining");
  });

  it("splits rent from utilities", () => {
    expect(categoryFromPlaid("RENT_AND_UTILITIES", "RENT_AND_UTILITIES_RENT")).toBe("Housing");
    expect(categoryFromPlaid("RENT_AND_UTILITIES", "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY")).toBe(
      "Bills",
    );
  });

  it("recognises the recurring ones as subscriptions", () => {
    expect(categoryFromPlaid("ENTERTAINMENT", "ENTERTAINMENT_TV_AND_MOVIES")).toBe("Subscriptions");
    expect(categoryFromPlaid("GENERAL_SERVICES", "GENERAL_SERVICES_SUBSCRIPTIONS")).toBe(
      "Subscriptions",
    );
  });

  it("keeps money that only moves out of spending", () => {
    // Counting these would charge a coffee twice: once on the card, again when
    // the card is paid off.
    expect(categoryFromPlaid("TRANSFER_IN", null)).toBe("Transfer");
    expect(categoryFromPlaid("TRANSFER_OUT", null)).toBe("Transfer");
    expect(categoryFromPlaid("LOAN_PAYMENTS", "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT")).toBe(
      "Card payment",
    );
  });

  it("recognises income", () => {
    expect(categoryFromPlaid("INCOME", "INCOME_WAGES")).toBe("Income");
  });

  it("lands somewhere sensible for a category it has never seen", () => {
    // Plaid adds categories over time; an unknown one must not break a sync.
    expect(categoryFromPlaid("SOMETHING_NEW", "SOMETHING_NEW_DETAIL")).toBe("Shopping");
    expect(categoryFromPlaid(null, null)).toBe("Shopping");
    expect(categoryFromPlaid(undefined, undefined)).toBe("Shopping");
  });

  it("only ever returns a category the product understands", () => {
    const known = new Set<string>([...SPEND_CATEGORIES, "Income", "Transfer", "Card payment"]);
    const samples = [
      ["INCOME", "INCOME_DIVIDENDS"],
      ["BANK_FEES", "BANK_FEES_ATM_FEES"],
      ["MEDICAL", "MEDICAL_DENTAL_CARE"],
      ["TRAVEL", "TRAVEL_FLIGHTS"],
      ["TRANSPORTATION", "TRANSPORTATION_GAS"],
      ["PERSONAL_CARE", "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS"],
      ["GOVERNMENT_AND_NON_PROFIT", "GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT"],
      ["HOME_IMPROVEMENT", "HOME_IMPROVEMENT_FURNITURE"],
      ["GENERAL_MERCHANDISE", "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES"],
    ] as const;

    for (const [primary, detailed] of samples) {
      expect(known).toContain(categoryFromPlaid(primary, detailed));
    }
  });
});
