import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { decodeProtectedHeader, importJWK, jwtVerify, type JWK } from "jose";
import { plaidClient } from "./client";

/**
 * Verifies that a webhook genuinely came from Plaid.
 *
 * Without this the endpoint is an open door: anyone who learns the URL could
 * trigger syncs at will, or mark every connection as broken. Plaid signs each
 * request with a JWT in the Plaid-Verification header, and the JWT carries a
 * hash of the body — so both the sender and the payload are checked.
 *
 * Three things have to hold, and all three matter:
 *   1. the signature verifies against Plaid's published key for that key id
 *   2. the body hashes to what the token says it should
 *   3. the token is recent, so a captured one cannot be replayed later
 */

const MAX_AGE_SECONDS = 5 * 60;

// Keys are fetched per key id and cached: Plaid rotates them, and refetching
// on every webhook would add a round trip to Plaid to every delivery.
const keyCache = new Map<string, JWK>();

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

async function verificationKey(keyId: string): Promise<JWK> {
  const cached = keyCache.get(keyId);
  if (cached) return cached;

  const response = await plaidClient().webhookVerificationKeyGet({ key_id: keyId });
  const key = response.data.key as unknown as JWK;

  keyCache.set(keyId, key);
  return key;
}

export function hashBody(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

/**
 * `rawBody` must be the exact bytes received. Re-serialising the parsed JSON
 * changes key order and whitespace, and the hash no longer matches.
 */
export async function verifyWebhook(
  verificationHeader: string | null,
  rawBody: string,
  now: Date = new Date(),
): Promise<void> {
  if (!verificationHeader) {
    throw new WebhookVerificationError("Missing Plaid-Verification header.");
  }

  let header;
  try {
    header = decodeProtectedHeader(verificationHeader);
  } catch {
    throw new WebhookVerificationError("Verification header is not a JWT.");
  }

  // Plaid signs with ES256. Accepting whatever the token asks for would allow
  // the alg=none and HMAC-with-the-public-key attacks.
  if (header.alg !== "ES256") {
    throw new WebhookVerificationError(`Unexpected signing algorithm "${header.alg}".`);
  }
  if (!header.kid) {
    throw new WebhookVerificationError("Verification header has no key id.");
  }

  const key = await verificationKey(header.kid);

  let payload;
  try {
    ({ payload } = await jwtVerify(verificationHeader, await importJWK(key, "ES256"), {
      algorithms: ["ES256"],
    }));
  } catch {
    throw new WebhookVerificationError("Signature did not verify.");
  }

  const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;
  const ageSeconds = Math.floor(now.getTime() / 1000) - issuedAt;
  if (!issuedAt || ageSeconds > MAX_AGE_SECONDS || ageSeconds < -60) {
    throw new WebhookVerificationError("Verification token is expired or not yet valid.");
  }

  const claimed = payload.request_body_sha256;
  if (typeof claimed !== "string") {
    throw new WebhookVerificationError("Verification token has no body hash.");
  }

  const actual = hashBody(rawBody);
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(claimed, "utf8");

  // Constant time, so the comparison cannot be used to learn the expected hash
  // one character at a time.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WebhookVerificationError("Body does not match the signed hash.");
  }
}

/** Exposed for tests; the cache is per process and otherwise invisible. */
export function clearVerificationKeyCache(): void {
  keyCache.clear();
}
