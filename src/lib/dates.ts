/**
 * Every function here takes the current time as an argument rather than reading
 * the clock itself.
 *
 * Two reasons. Tests stay deterministic without freezing global time. More
 * importantly, a formatter that reads Date.now() internally produces different
 * output on the server than during hydration a moment later, which React
 * reports as a mismatch and repairs by throwing away the server HTML. Making
 * "now" an argument forces the caller to decide where it comes from.
 *
 * Locale is pinned to en-US for the same reason: the server's locale is not the
 * visitor's, and Intl silently follows the environment otherwise.
 */

const DAY_SHORT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const DAY_WITH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DAY_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** "Today", "Yesterday", "Sun, Aug 23", or "Aug 23, 2025" across a year. */
export function formatDayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, addDays(now, -1))) return "Yesterday";
  if (date.getFullYear() === now.getFullYear()) return DAY_SHORT.format(date);
  return DAY_WITH_YEAR.format(date);
}

/** "Tuesday, August 25, 2026" — for detail views, where space allows. */
export function formatFullDate(date: Date): string {
  return DAY_LONG.format(date);
}

export function formatTime(date: Date): string {
  return TIME.format(date);
}

/**
 * "just now", "12 minutes ago", "2 days ago". Coarse on purpose: a sync
 * timestamp that ticks every second draws the eye to the least useful thing on
 * the screen.
 */
export function formatRelativeTime(then: Date, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${plural(minutes, "minute")} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${plural(hours, "hour")} ago`;

  const days = Math.round(hours / 24);
  return `${days} ${plural(days, "day")} ago`;
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
