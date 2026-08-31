"use server";

import { revalidatePath } from "next/cache";
import type { Transaction as PlaidTransaction, RemovedTransaction } from "plaid";
import { requireUser } from "@/lib/auth";
import { decryptToken } from "@/lib/crypto/tokens";
import { createClient } from "@/lib/supabase/server";
import { balanceToMinor, plaidClient } from "./client";
import { collapsePages } from "./sync";

export type SyncResult =
  | { ok: true; added: number; updated: number; removed: number; syncedAt: string }
  | { ok: false; error: string };

// Plaid caps a page at 500; walking more than this in one request would take
// long enough that the person waiting assumes it has hung.
const MAX_PAGES = 20;

/**
 * Pulls everything new since last time, for every connection this user has.
 *
 * Cursor-based: Plaid remembers what we have already been told, so a sync asks
 * for the difference rather than re-reading two years of history. The cursor is
 * only saved once the changes it describes are safely written — if the write
 * fails, the next sync asks for the same window again rather than skipping it.
 */
export async function syncTransactions(): Promise<SyncResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "You need to be signed in to sync." };
  }

  const supabase = await createClient();
  const client = plaidClient();

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .not("access_token_encrypted", "is", null);

  if (itemsError) return { ok: false, error: "Could not read your connections." };
  if (!items || items.length === 0) {
    return { ok: true, added: 0, updated: 0, removed: 0, syncedAt: new Date().toISOString() };
  }

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const item of items) {
    // A sample connection has no Plaid item behind it to sync.
    if (!item.access_token_encrypted?.startsWith("v1:")) continue;

    try {
      const accessToken = decryptToken(item.access_token_encrypted);
      const pages: {
        added: PlaidTransaction[];
        modified: PlaidTransaction[];
        removed: RemovedTransaction[];
        next_cursor: string;
      }[] = [];

      let cursor = item.sync_cursor ?? undefined;
      let hasMore = true;
      let page = 0;

      while (hasMore && page < MAX_PAGES) {
        const response = await client.transactionsSync({
          access_token: accessToken,
          cursor,
          count: 500,
        });

        pages.push({
          added: response.data.added,
          modified: response.data.modified,
          removed: response.data.removed,
          next_cursor: response.data.next_cursor,
        });

        cursor = response.data.next_cursor;
        hasMore = response.data.has_more;
        page += 1;
      }

      const changes = collapsePages(pages);

      // Plaid identifies accounts by its own id; ours are database rows.
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, plaid_account_id")
        .eq("user_id", user.id)
        .eq("item_id", item.id);

      const accountIdFor = new Map(
        (accounts ?? []).map((account) => [account.plaid_account_id, account.id] as const),
      );

      const rowsFor = (list: typeof changes.added) =>
        list
          .filter((transaction) => accountIdFor.has(transaction.plaid_account_id))
          .map((transaction) => ({
            user_id: user.id,
            account_id: accountIdFor.get(transaction.plaid_account_id)!,
            plaid_transaction_id: transaction.plaid_transaction_id,
            merchant_name: transaction.merchant_name,
            amount_minor: transaction.amount_minor,
            occurred_at: transaction.occurred_at,
            status: transaction.status,
            category: transaction.category,
          }));

      const toWrite = [...rowsFor(changes.added), ...rowsFor(changes.modified)];

      if (toWrite.length > 0) {
        const { error } = await supabase
          .from("transactions")
          .upsert(toWrite, { onConflict: "user_id,plaid_transaction_id" });

        if (error) {
          console.error("Could not write transactions", error);
          // Leave the cursor where it was, so nothing is skipped next time.
          continue;
        }
      }

      if (changes.removedIds.length > 0) {
        await supabase
          .from("transactions")
          .delete()
          .eq("user_id", user.id)
          .in("plaid_transaction_id", changes.removedIds);
      }

      // Balances move with the transactions, so refresh them in the same pass.
      const balances = await client.accountsBalanceGet({ access_token: accessToken });
      for (const account of balances.data.accounts) {
        const id = accountIdFor.get(account.account_id);
        if (!id) continue;
        await supabase
          .from("accounts")
          .update({
            current_balance_minor: balanceToMinor(account.balances.current) ?? 0,
            available_balance_minor: balanceToMinor(account.balances.available),
            credit_limit_minor: balanceToMinor(account.balances.limit),
          })
          .eq("id", id)
          .eq("user_id", user.id);
      }

      await supabase
        .from("items")
        .update({
          sync_cursor: changes.cursor,
          last_synced_at: new Date().toISOString(),
          status: "healthy",
        })
        .eq("id", item.id)
        .eq("user_id", user.id);

      added += changes.added.length;
      updated += changes.modified.length;
      removed += changes.removedIds.length;
    } catch (error) {
      // One broken connection should not stop the others from syncing.
      console.error(`Sync failed for item ${item.id}`, error);
      const code = (error as { response?: { data?: { error_code?: string } } })?.response?.data
        ?.error_code;

      if (code === "ITEM_LOGIN_REQUIRED") {
        await supabase
          .from("items")
          .update({ status: "reconnect_required" })
          .eq("id", item.id)
          .eq("user_id", user.id);
      }
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, added, updated, removed, syncedAt: new Date().toISOString() };
}
