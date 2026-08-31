import "server-only";

import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { plaidEnv } from "@/lib/env";
import { toMinor } from "@/lib/money";

/**
 * Built per call rather than held as a module constant, so a credential change
 * takes effect without a restart, and so importing this file never reads the
 * environment as a side effect.
 */
export function plaidClient(): PlaidApi {
  const { clientId, secret, environment } = plaidEnv();

  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[environment],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
        },
      },
    }),
  );
}

/**
 * Plaid returns balances as decimal numbers. Everything downstream is integer
 * minor units, and null means the institution did not report the figure —
 * which is different from reporting zero and must not become 0.
 *
 * Uses toMinor rather than rounding here, so Plaid balances get the same
 * half-cent handling as every other amount: a plain Math.round(value * 100)
 * turns 1.005 into 100, because the multiplication lands just below.
 */
export function balanceToMinor(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return toMinor(value);
}

/**
 * Plaid's account types map onto the three this product understands. Anything
 * else — a loan, a brokerage, a mortgage — is not something E-PON can show
 * usefully yet, so it is skipped rather than mislabelled as a chequing account.
 */
export function accountTypeFor(
  type: string,
  subtype: string | null | undefined,
): "checking" | "savings" | "credit" | null {
  if (type === "credit") return "credit";
  if (type === "depository") {
    if (subtype === "savings" || subtype === "money market" || subtype === "cd") return "savings";
    if (subtype === "checking" || subtype === "prepaid" || subtype === null) return "checking";
    return "checking";
  }
  return null;
}
