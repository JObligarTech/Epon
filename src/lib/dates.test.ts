import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDayLabel,
  formatFullDate,
  formatRelativeTime,
  formatTime,
  isSameDay,
  startOfDay,
} from "./dates";

const NOW = new Date(2026, 7, 25, 14, 30); // Tue 25 Aug 2026, local time

describe("day arithmetic", () => {
  it("compares calendar days, not timestamps", () => {
    expect(isSameDay(new Date(2026, 7, 25, 0, 1), new Date(2026, 7, 25, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 7, 25, 23, 59), new Date(2026, 7, 26, 0, 1))).toBe(false);
  });

  it("does not mutate its input", () => {
    const original = new Date(2026, 7, 25, 14, 30);
    addDays(original, -3);
    startOfDay(original);
    expect(original.getTime()).toBe(new Date(2026, 7, 25, 14, 30).getTime());
  });

  it("rolls across month boundaries", () => {
    expect(addDays(new Date(2026, 7, 1), -1).getMonth()).toBe(6);
  });
});

describe("formatDayLabel", () => {
  it("names today and yesterday", () => {
    expect(formatDayLabel(new Date(2026, 7, 25, 8, 12), NOW)).toBe("Today");
    expect(formatDayLabel(new Date(2026, 7, 24, 22, 0), NOW)).toBe("Yesterday");
  });

  it("uses a weekday within the same year", () => {
    expect(formatDayLabel(new Date(2026, 7, 23), NOW)).toBe("Sun, Aug 23");
  });

  it("adds the year once it is a different one", () => {
    expect(formatDayLabel(new Date(2025, 11, 30), NOW)).toBe("Dec 30, 2025");
  });

  it("treats a late-evening yesterday as yesterday, not as hours ago", () => {
    expect(formatDayLabel(new Date(2026, 7, 24, 23, 58), NOW)).toBe("Yesterday");
  });
});

describe("formatRelativeTime", () => {
  const at = (ms: number) => new Date(NOW.getTime() - ms);

  it("stays coarse near zero", () => {
    expect(formatRelativeTime(at(0), NOW)).toBe("just now");
    expect(formatRelativeTime(at(9_000), NOW)).toBe("just now");
  });

  it("counts up through the units", () => {
    expect(formatRelativeTime(at(40_000), NOW)).toBe("40 seconds ago");
    expect(formatRelativeTime(at(12 * 60_000), NOW)).toBe("12 minutes ago");
    expect(formatRelativeTime(at(3 * 3_600_000), NOW)).toBe("3 hours ago");
    expect(formatRelativeTime(at(46 * 3_600_000), NOW)).toBe("2 days ago");
  });

  it("singularises one of each unit", () => {
    expect(formatRelativeTime(at(60_000), NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(at(3_600_000), NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(at(24 * 3_600_000), NOW)).toBe("1 day ago");
  });

  it("never reports the future as negative", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 60_000), NOW)).toBe("just now");
  });
});

describe("absolute formats", () => {
  it("formats a time of day", () => {
    expect(formatTime(new Date(2026, 7, 25, 8, 12))).toBe("8:12 AM");
  });

  it("spells out a full date", () => {
    expect(formatFullDate(new Date(2026, 7, 25))).toBe("Tuesday, August 25, 2026");
  });
});
