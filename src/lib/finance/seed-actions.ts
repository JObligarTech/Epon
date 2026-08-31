"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMockDataset } from "./mock-data";
import { SAMPLE_PREFIX, sampleItemId } from "./sample";
import { INSTITUTION_HUES } from "./hues";

/**
 * Writes the sample set into the signed-in user's own rows.
 *
 * Inserted through their session rather than the service role, so it goes
 * through the same row level security every other write does — if the policies
 * were wrong, this would fail rather than quietly succeed.
 */
export async function loadSampleData(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const dataset = getMockDataset(new Date());

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .insert(
      dataset.institutions.map((institution) => ({
        user_id: user.id,
        plaid_item_id: sampleItemId(institution.id),
        plaid_institution_id: institution.id,
        institution_name: institution.name,
        hue_index: INSTITUTION_HUES.indexOf(institution.hue) % INSTITUTION_HUES.length,
        status: institution.status,
        last_synced_at: institution.lastSyncedAt,
      })),
    )
    .select();

  if (itemsError) throw new Error(`Could not load sample data: ${itemsError.code}`);

  // Mock ids are not database ids, so every reference has to be remapped.
  const itemIdFor = new Map(
    items.map((row) => [row.plaid_institution_id, row.id] as const),
  );

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .insert(
      dataset.accounts.map((account) => ({
        user_id: user.id,
        item_id: itemIdFor.get(account.institutionId)!,
        plaid_account_id: `${SAMPLE_PREFIX}${account.id}`,
        name: account.name,
        mask: account.mask,
        type: account.type,
        current_balance_minor: account.currentBalanceMinor,
        available_balance_minor: account.availableBalanceMinor,
        credit_limit_minor: account.creditLimitMinor,
        apy: account.apy,
      })),
    )
    .select();

  if (accountsError) throw new Error(`Could not load sample data: ${accountsError.code}`);

  const accountIdFor = new Map(
    accounts.map((row) => [row.plaid_account_id.slice(SAMPLE_PREFIX.length), row.id] as const),
  );

  const { error: transactionsError } = await supabase.from("transactions").insert(
    dataset.transactions.map((transaction) => ({
      user_id: user.id,
      account_id: accountIdFor.get(transaction.accountId)!,
      plaid_transaction_id: `${SAMPLE_PREFIX}${transaction.id}`,
      merchant_name: transaction.merchantName,
      amount_minor: transaction.amountMinor,
      occurred_at: transaction.occurredAt,
      status: transaction.status,
      category: transaction.category,
    })),
  );

  if (transactionsError) throw new Error(`Could not load sample data: ${transactionsError.code}`);

  revalidatePath("/", "layout");
}

/**
 * Deleting the items is enough: accounts cascade from items, and transactions
 * cascade from accounts. Real connections are untouched, because only sample
 * items carry the prefix.
 */
export async function removeSampleData(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("user_id", user.id)
    .like("plaid_item_id", `${SAMPLE_PREFIX}%`);

  if (error) throw new Error(`Could not remove sample data: ${error.code}`);

  revalidatePath("/", "layout");
}
