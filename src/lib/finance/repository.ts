import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { accountFromRow, institutionFromRow, transactionFromRow } from "./mappers";
import { getMockDataset } from "./mock-data";
import type { Dataset } from "./types";

/**
 * The one place the product gets its data.
 *
 * Every query is scoped by the user's session and further fenced by row level
 * security, so a bug here cannot become a data leak — the database refuses
 * rows this user does not own regardless of what is asked for. The explicit
 * .eq("user_id", ...) is belt as well as braces: it also lets Postgres use the
 * user_id indexes rather than filtering after the fact.
 */

export type DatasetSource = "database" | "mock";

export type LoadedDataset = {
  dataset: Dataset;
  source: DatasetSource;
};

const EMPTY: Dataset = { institutions: [], accounts: [], transactions: [] };

export async function loadDataset(now: Date): Promise<LoadedDataset> {
  // Nothing configured: the product still has to be usable and reviewable.
  if (!hasSupabaseConfig()) {
    return { dataset: getMockDataset(now), source: "mock" };
  }

  const user = await getCurrentUser();
  if (!user) return { dataset: EMPTY, source: "database" };

  const supabase = await createClient();

  const [items, accounts, transactions] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("hue_index", { ascending: true }),
    supabase.from("accounts").select("*").eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      // A ledger is read, not exhaustively scrolled. More than this and the
      // page weight matters more than the extra history.
      .limit(500),
  ]);

  const failure = items.error ?? accounts.error ?? transactions.error;
  if (failure) {
    // Surfacing the raw Postgres message would leak schema detail to the
    // browser; the error boundary shows something a person can act on.
    throw new Error(`Could not load your accounts: ${failure.code ?? "unknown"}`);
  }

  return {
    source: "database",
    dataset: {
      institutions: (items.data ?? []).map(institutionFromRow),
      accounts: (accounts.data ?? []).map(accountFromRow),
      transactions: (transactions.data ?? []).map(transactionFromRow),
    },
  };
}

/** True when the signed-in user has not connected anything yet. */
export function isEmpty(dataset: Dataset): boolean {
  return dataset.accounts.length === 0;
}
