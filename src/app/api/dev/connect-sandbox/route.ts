import { NextResponse } from "next/server";
import { Products } from "plaid";
import { plaidClient } from "@/lib/plaid/client";
import { exchangePublicToken } from "@/lib/plaid/connect-actions";

/**
 * Connects a sandbox institution without clicking through Plaid Link.
 *
 * Link is Plaid's own interface and does not need retesting; what this
 * exercises is our half — the exchange, encrypting the access token, storing
 * the connection, and importing the accounts. It also saves relinking by hand
 * every time the database is reset.
 *
 * Refused outright unless this is a non-production build pointed at Plaid's
 * sandbox. Both conditions, not either: a production build reading sandbox
 * credentials should still refuse.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" || process.env.PLAID_ENV !== "sandbox") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  try {
    const client = plaidClient();

    // ins_109508 is First Platypus Bank, Plaid's standard sandbox institution.
    const sandbox = await client.sandboxPublicTokenCreate({
      institution_id: "ins_109508",
      initial_products: [Products.Transactions],
    });

    // Deliberately the same path the real flow takes, so this proves the code
    // that actually runs in production rather than a copy of it.
    const result = await exchangePublicToken(sandbox.data.public_token);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Sandbox connect failed", error);
    return NextResponse.json({ error: "Sandbox connect failed." }, { status: 500 });
  }
}
