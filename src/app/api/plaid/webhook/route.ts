import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncItem } from "@/lib/plaid/sync-actions";
import { verifyWebhook, WebhookVerificationError } from "@/lib/plaid/webhook-verify";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Where Plaid tells us something changed, so "updated 2 minutes ago" is true
 * without anyone pressing anything.
 *
 * A webhook arrives with no user session — Plaid is not signed in as anybody —
 * so this is the one place the service role is used. Every query it makes is
 * therefore scoped by hand, starting from the Plaid item id in the payload.
 */
export async function POST(request: Request) {
  // The raw bytes, not the parsed object: the signature covers exactly what
  // was sent, and re-serialising changes whitespace and key order.
  const rawBody = await request.text();

  try {
    await verifyWebhook(request.headers.get("Plaid-Verification"), rawBody);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.warn("Rejected an unverified Plaid webhook:", error.message);
      return NextResponse.json({ error: "Unverified." }, { status: 401 });
    }
    console.error("Webhook verification failed unexpectedly", error);
    return NextResponse.json({ error: "Could not verify." }, { status: 500 });
  }

  let payload: { webhook_type?: string; webhook_code?: string; item_id?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  const { webhook_type: type, webhook_code: code, item_id: plaidItemId } = payload;
  if (!plaidItemId) {
    return NextResponse.json({ error: "No item id." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("plaid_item_id", plaidItemId)
    .maybeSingle();

  // An unknown item is not an error worth retrying: acknowledge it, or Plaid
  // will redeliver forever.
  if (!item) {
    console.warn(`Webhook for an item we do not hold: ${plaidItemId}`);
    return NextResponse.json({ ok: true });
  }

  try {
    if (type === "TRANSACTIONS") {
      // Every transactions webhook means the same thing under /sync: ask again.
      await syncItem(supabase, item);
      revalidatePath("/", "layout");
    } else if (type === "ITEM" && code === "ERROR") {
      // Plaid reports the specific error, but the only one a person can act on
      // is a login that has stopped working.
      const errorCode = (payload as { error?: { error_code?: string } }).error?.error_code;
      if (errorCode === "ITEM_LOGIN_REQUIRED") {
        await supabase
          .from("items")
          .update({ status: "reconnect_required" })
          .eq("id", item.id);
        revalidatePath("/", "layout");
      }
    } else if (type === "ITEM" && code === "PENDING_DISCONNECT") {
      await supabase.from("items").update({ status: "reconnect_required" }).eq("id", item.id);
      revalidatePath("/", "layout");
    }
  } catch (error) {
    // Answer 500 so Plaid retries; the work is idempotent, so a repeat is safe.
    console.error(`Handling ${type}/${code} failed for item ${item.id}`, error);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
