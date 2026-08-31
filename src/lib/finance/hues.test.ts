import { describe, expect, it } from "vitest";
import { hueForIndex, INSTITUTION_HUES, nextHueIndex } from "./hues";

describe("hueForIndex", () => {
  it("maps each slot to its own hue", () => {
    const hues = INSTITUTION_HUES.map((_, index) => hueForIndex(index));
    expect(new Set(hues).size).toBe(INSTITUTION_HUES.length);
  });

  it("wraps past the end rather than returning undefined", () => {
    expect(hueForIndex(INSTITUTION_HUES.length)).toBe(INSTITUTION_HUES[0]);
    expect(hueForIndex(INSTITUTION_HUES.length + 2)).toBe(INSTITUTION_HUES[2]);
  });

  it("handles a negative index without breaking", () => {
    expect(INSTITUTION_HUES).toContain(hueForIndex(-1));
  });
});

describe("nextHueIndex", () => {
  it("hands out slots in order for a new user", () => {
    const used: number[] = [];
    for (let expected = 0; expected < 6; expected += 1) {
      const next = nextHueIndex(used);
      expect(next).toBe(expected);
      used.push(next);
    }
  });

  it("never repeats a slot while one is free", () => {
    // Four banks would collide roughly seventy percent of the time if the hue
    // were hashed from the institution id instead of assigned.
    const used = [0, 1, 2];
    expect(used).not.toContain(nextHueIndex(used));
  });

  it("fills a gap left by a removed connection", () => {
    expect(nextHueIndex([0, 2, 3])).toBe(1);
  });

  it("keeps working past six connections", () => {
    const next = nextHueIndex([0, 1, 2, 3, 4, 5]);
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThan(6);
  });
});
