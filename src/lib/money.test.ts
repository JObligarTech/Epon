import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatMoneyRounded,
  formatMoneyWithDirection,
  formatSignedMoney,
  MINUS,
  shareOf,
  sumMinor,
  toMajor,
  toMinor,
} from "./money";

describe("minor units", () => {
  it("round-trips through major units", () => {
    expect(toMinor(7842.19)).toBe(784219);
    expect(toMajor(784219)).toBe(7842.19);
  });

  it("does not accumulate floating point error", () => {
    // 0.1 + 0.2 !== 0.3 in floats; in cents it is exact.
    expect(sumMinor([10, 20])).toBe(30);
    expect(sumMinor([toMinor(0.1), toMinor(0.2)])).toBe(toMinor(0.3));
  });

  it("rounds exact half cents away from zero, in both directions", () => {
    // 1.005 * 100 is 100.49999999999999 in binary floating point. Naive
    // rounding loses the cent; negatives lose it the other way.
    expect(toMinor(1.005)).toBe(101);
    expect(toMinor(-1.005)).toBe(-101);
    expect(toMinor(0.005)).toBe(1);
    expect(toMinor(-0.005)).toBe(-1);
  });

  it("converts ordinary two-decimal amounts exactly", () => {
    for (const [major, minor] of [
      [6.45, 645],
      [-84.12, -8412],
      [3214.88, 321488],
      [12430.5, 1243050],
      [0, 0],
    ] as const) {
      expect(toMinor(major)).toBe(minor);
    }
  });
});

describe("formatting", () => {
  it("shows magnitude only by default", () => {
    expect(formatMoney(784219)).toBe("$7,842.19");
    expect(formatMoney(-645)).toBe("$6.45");
  });

  it("drops cents when rounded", () => {
    expect(formatMoneyRounded(784219)).toBe("$7,842");
    expect(formatMoneyRounded(-21593)).toBe("$216");
  });

  it("always carries a sign when asked", () => {
    expect(formatSignedMoney(321488)).toBe("+$3,214.88");
    expect(formatSignedMoney(-645)).toBe(`${MINUS}$6.45`);
  });

  it("marks only outflow when showing direction", () => {
    expect(formatMoneyWithDirection(-645)).toBe(`${MINUS}$6.45`);
    expect(formatMoneyWithDirection(321488)).toBe("$3,214.88");
  });

  it("uses a true minus sign, not a hyphen", () => {
    // A hyphen is narrower than a digit and breaks tabular alignment.
    expect(formatSignedMoney(-645)).not.toContain("-");
    expect(MINUS).toBe("−");
  });
});

describe("shareOf", () => {
  it("returns a fraction of the total", () => {
    expect(shareOf(25, 100)).toBe(0.25);
  });

  it("returns zero rather than NaN when the total is zero", () => {
    expect(shareOf(0, 0)).toBe(0);
  });
});
