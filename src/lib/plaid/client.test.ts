/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { accountTypeFor, balanceToMinor } from "./client";

describe("balanceToMinor", () => {
  it("converts Plaid's decimals to whole cents", () => {
    expect(balanceToMinor(7842.19)).toBe(784219);
    expect(balanceToMinor(0)).toBe(0);
    expect(balanceToMinor(110)).toBe(11000);
  });

  it("keeps null as null rather than turning it into zero", () => {
    // Plaid returns null when the institution did not report a figure. A card
    // with no reported available balance is not a card with none left, and
    // rendering "$0 available" would be a lie about someone's money.
    expect(balanceToMinor(null)).toBeNull();
    expect(balanceToMinor(undefined)).toBeNull();
  });

  it("rounds rather than truncating", () => {
    expect(balanceToMinor(1.005)).toBe(101);
    expect(balanceToMinor(-1.005)).toBe(-101);
  });
});

describe("accountTypeFor", () => {
  it("maps depository subtypes onto checking and savings", () => {
    expect(accountTypeFor("depository", "checking")).toBe("checking");
    expect(accountTypeFor("depository", "savings")).toBe("savings");
    expect(accountTypeFor("depository", "money market")).toBe("savings");
    expect(accountTypeFor("depository", "cd")).toBe("savings");
  });

  it("maps credit to credit", () => {
    expect(accountTypeFor("credit", "credit card")).toBe("credit");
    expect(accountTypeFor("credit", null)).toBe("credit");
  });

  it("skips account types this product cannot show honestly", () => {
    // A mortgage displayed as a chequing account is worse than not showing it.
    expect(accountTypeFor("loan", "mortgage")).toBeNull();
    expect(accountTypeFor("loan", "student")).toBeNull();
    expect(accountTypeFor("investment", "brokerage")).toBeNull();
    expect(accountTypeFor("other", null)).toBeNull();
  });

  it("falls back to checking for an unfamiliar depository subtype", () => {
    // Depository always means money you hold; the subtype is the detail.
    expect(accountTypeFor("depository", "hsa")).toBe("checking");
    expect(accountTypeFor("depository", null)).toBe("checking");
  });
});
