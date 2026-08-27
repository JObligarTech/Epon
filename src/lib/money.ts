/**
 * Money is integer minor units (cents) everywhere — never a float. 0.1 + 0.2
 * is not 0.3 in binary floating point, and a finance app cannot carry that.
 * Postgres will hold these as bigint, and Plaid amounts are converted on the
 * way in.
 */

const MINOR_PER_MAJOR = 100;

/** U+2212, not a hyphen: it aligns with digits at the same optical weight. */
export const MINUS = "−";

const FULL = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ROUNDED = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Converts a decimal amount to cents. Input is expected to carry at most two
 * decimal places — that is what Plaid sends and what a currency amount means.
 *
 * Multiplying by 100 can land a hair below the true value: 1.005 * 100 is
 * 100.49999999999999, which would round down to 100 and quietly lose a cent.
 * Rounding the magnitude with a relative nudge fixes that, and reapplying the
 * sign afterwards keeps exact halves rounding away from zero in both
 * directions — Math.round alone sends -100.5 to -100.
 */
export function toMinor(major: number): number {
  const scaled = Math.abs(major) * MINOR_PER_MAJOR;
  const nudge = scaled * Number.EPSILON * 4;
  const magnitude = Math.round(scaled + nudge);
  return major < 0 ? -magnitude : magnitude;
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

/** Magnitude only: "$7,842.19". Callers decide how to show direction. */
export function formatMoney(minor: number): string {
  return FULL.format(Math.abs(toMajor(minor)));
}

/** Magnitude, no cents: "$7,842". For dense places where cents are noise. */
export function formatMoneyRounded(minor: number): string {
  return ROUNDED.format(Math.abs(toMajor(minor)));
}

/** Always carries a sign: "+$3,214.88" or "−$6.45". */
export function formatSignedMoney(minor: number): string {
  return `${minor < 0 ? MINUS : "+"}${formatMoney(minor)}`;
}

/** Signed only when negative: "−$6.45", but "$3,214.88" for inflow. */
export function formatMoneyWithDirection(minor: number): string {
  return minor < 0 ? `${MINUS}${formatMoney(minor)}` : formatMoney(minor);
}

export function sumMinor(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Share of a total, 0..1, guarding the empty case so a zero total renders as
 * an empty bar rather than NaN.
 */
export function shareOf(part: number, total: number): number {
  if (total === 0) return 0;
  return part / total;
}
