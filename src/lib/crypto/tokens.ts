import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Encryption for Plaid access tokens at rest.
 *
 * A Plaid access token is read access to somebody's bank. If the database is
 * ever dumped — a backup on a laptop, a misconfigured replica, a compromised
 * connection string — the tokens must be inert without a key that lives
 * somewhere else entirely.
 *
 * AES-256-GCM, so tampering is detected rather than silently decrypted into
 * something else. A fresh random IV per encryption, so the same token
 * encrypted twice produces different ciphertext and an observer cannot tell
 * that two rows hold the same value.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits, the size GCM is defined for
const VERSION = "v1";

export class TokenCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenCryptoError";
  }
}

/**
 * Read lazily, and never cached: a rotated key should take effect on the next
 * call rather than on the next deploy.
 */
function key(): Buffer {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new TokenCryptoError(
      "PLAID_TOKEN_ENCRYPTION_KEY is not set. Generate one with " +
        "`node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` " +
        "and add it to .env.local, and to Vercel for deployed environments.",
    );
  }

  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== KEY_BYTES) {
    throw new TokenCryptoError(
      `PLAID_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${decoded.length}. ` +
        "It should be 32 random bytes, base64 encoded.",
    );
  }

  return decoded;
}

/**
 * Returns "v1:iv:tag:ciphertext", all base64. The version prefix is what makes
 * a future algorithm change survivable: old rows stay readable while new ones
 * are written differently.
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) throw new TokenCryptoError("Refusing to encrypt an empty token.");

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptToken(encoded: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 4) {
    throw new TokenCryptoError("Stored token is not in the expected format.");
  }

  const [version, ivPart, tagPart, ciphertextPart] = parts;
  if (version !== VERSION) {
    throw new TokenCryptoError(`Stored token uses unknown format "${version}".`);
  }

  const iv = Buffer.from(ivPart, "base64");
  const tag = Buffer.from(tagPart, "base64");

  if (iv.length !== IV_BYTES) throw new TokenCryptoError("Stored token has a malformed IV.");

  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // GCM raises here when the tag does not match: either the ciphertext was
    // altered or the key is wrong. Not distinguished on purpose — telling them
    // apart tells an attacker which one they got right.
    throw new TokenCryptoError("Stored token could not be decrypted.");
  }
}

/** True when a stored value looks like this module wrote it. */
export function isEncrypted(value: string | null): boolean {
  return typeof value === "string" && value.startsWith(`${VERSION}:`);
}

/**
 * Constant time, so comparing tokens cannot be used to learn one a character
 * at a time from how long the comparison took.
 */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
