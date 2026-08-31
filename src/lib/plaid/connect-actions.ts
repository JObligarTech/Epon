"use server";

import { revalidatePath } from "next/cache";
import { CountryCode, Products } from "plaid";
import { requireUser } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto/tokens";
import { nextHueIndex } from "@/lib/finance/hues";
import { createClient } from "@/lib/supabase/server";
import { accountTypeFor, balanceToMinor, plaidClient } from "./client";

export type ConnectResult =
  | { ok: true; institutionName: string; accountCount: number }
  | { ok: false; error: string };

/**
 * A link token is what the browser is allowed to hold: short-lived, scoped to
 * this one user, and useless for reading anything. The access token it
 * eventually produces never leaves the server.
 */
export async function createLinkToken(): Promise<{ token: string } | { error: string }> {
  try {
    const user = await requireUser();
    const client = plaidClient();

    const response = await client.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "E-PON",
      // Only what the product actually uses. Every extra product widens the
      // permissions someone is asked to grant, and the production review.
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      // Plaid cannot reach localhost, so this is only set where the app is
      // deployed. Without it there are no webhooks and sync is manual only.
      ...(process.env.PLAID_WEBHOOK_URL
        ? { webhook: process.env.PLAID_WEBHOOK_URL }
        : {}),
    });

    return { token: response.data.link_token };
  } catch (error) {
    console.error("Could not create a Plaid link token", error);
    return { error: "Could not start the connection. Try again in a moment." };
  }
}

/**
 * Exchanges the browser's public token for an access token, stores it
 * encrypted, and imports the accounts it unlocks.
 *
 * Everything is written under the user's own session, so row level security
 * applies to these writes exactly as it does to any other.
 */
export async function exchangePublicToken(publicToken: string): Promise<ConnectResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "You need to be signed in to connect an account." };
  }

  const client = plaidClient();
  const supabase = await createClient();

  try {
    const exchange = await client.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchange.data.access_token;
    const plaidItemId = exchange.data.item_id;

    const [accountsResponse, itemResponse] = await Promise.all([
      client.accountsGet({ access_token: accessToken }),
      client.itemGet({ access_token: accessToken }),
    ]);

    const institutionId = itemResponse.data.item.institution_id ?? "unknown";
    let institutionName = "Your bank";

    if (itemResponse.data.item.institution_id) {
      const institution = await client.institutionsGetById({
        institution_id: itemResponse.data.item.institution_id,
        country_codes: [CountryCode.Us],
      });
      institutionName = institution.data.institution.name;
    }

    // Colour is assigned once, from the slots this user is not already using,
    // so connecting a new bank never repaints the existing ones.
    const { data: existing } = await supabase
      .from("items")
      .select("hue_index")
      .eq("user_id", user.id);

    const { data: item, error: itemError } = await supabase
      .from("items")
      .upsert(
        {
          user_id: user.id,
          plaid_item_id: plaidItemId,
          plaid_institution_id: institutionId,
          institution_name: institutionName,
          access_token_encrypted: encryptToken(accessToken),
          hue_index: nextHueIndex((existing ?? []).map((row) => row.hue_index)),
          status: "healthy",
          last_synced_at: new Date().toISOString(),
        },
        // Reconnecting the same institution updates the connection rather than
        // creating a second one alongside it.
        { onConflict: "user_id,plaid_item_id" },
      )
      .select()
      .single();

    if (itemError || !item) {
      console.error("Could not store the connection", itemError);
      return { ok: false, error: "Connected, but we could not save it. Try again." };
    }

    const accounts = accountsResponse.data.accounts
      .map((account) => {
        const type = accountTypeFor(account.type, account.subtype);
        if (!type) return null;
        return {
          user_id: user.id,
          item_id: item.id,
          plaid_account_id: account.account_id,
          name: account.name,
          mask: account.mask ?? null,
          type,
          current_balance_minor: balanceToMinor(account.balances.current) ?? 0,
          available_balance_minor: balanceToMinor(account.balances.available),
          credit_limit_minor: balanceToMinor(account.balances.limit),
          apy: null,
        };
      })
      .filter((account) => account !== null);

    if (accounts.length > 0) {
      const { error: accountsError } = await supabase
        .from("accounts")
        .upsert(accounts, { onConflict: "user_id,plaid_account_id" });

      if (accountsError) {
        console.error("Could not store accounts", accountsError);
        return { ok: false, error: "Connected, but we could not save the accounts." };
      }
    }

    revalidatePath("/", "layout");
    return { ok: true, institutionName, accountCount: accounts.length };
  } catch (error) {
    // Plaid's errors carry detail that belongs in a log, not in a browser.
    console.error("Could not exchange the Plaid public token", error);
    return { ok: false, error: "We could not finish connecting that account. Try again." };
  }
}
