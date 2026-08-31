/**
 * @vitest-environment node
 */
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptToken,
  encryptToken,
  isEncrypted,
  TokenCryptoError,
  tokensMatch,
} from "./tokens";

const ORIGINAL = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

// A realistic shape: Plaid access tokens look like this.
const TOKEN = "access-sandbox-de3ce8ef-33f8-452c-a685-8671031fc0f6";

beforeEach(() => {
  process.env.PLAID_TOKEN_ENCRYPTION_KEY = KEY;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  else process.env.PLAID_TOKEN_ENCRYPTION_KEY = ORIGINAL;
});

describe("round trip", () => {
  it("returns exactly what went in", () => {
    expect(decryptToken(encryptToken(TOKEN))).toBe(TOKEN);
  });

  it("does not leave the plaintext visible in the stored value", () => {
    const stored = encryptToken(TOKEN);
    expect(stored).not.toContain(TOKEN);
    expect(stored).not.toContain("access-sandbox");
  });

  it("produces different ciphertext each time", () => {
    // A fresh IV per encryption, so identical tokens in two rows do not look
    // identical to anyone reading the table.
    const first = encryptToken(TOKEN);
    const second = encryptToken(TOKEN);

    expect(first).not.toBe(second);
    expect(decryptToken(first)).toBe(decryptToken(second));
  });

  it("carries a version prefix so the format can change later", () => {
    expect(encryptToken(TOKEN).startsWith("v1:")).toBe(true);
    expect(isEncrypted(encryptToken(TOKEN))).toBe(true);
    expect(isEncrypted(TOKEN)).toBe(false);
    expect(isEncrypted(null)).toBe(false);
  });
});

describe("tampering", () => {
  it("refuses ciphertext that has been altered", () => {
    // Without the authentication tag this would decrypt to something else and
    // be used as though it were genuine.
    const [version, iv, tag, ciphertext] = encryptToken(TOKEN).split(":");
    const flipped = Buffer.from(ciphertext, "base64");
    flipped[0] ^= 0xff;

    expect(() =>
      decryptToken([version, iv, tag, flipped.toString("base64")].join(":")),
    ).toThrow(TokenCryptoError);
  });

  it("refuses an altered authentication tag", () => {
    const [version, iv, tag, ciphertext] = encryptToken(TOKEN).split(":");
    const flipped = Buffer.from(tag, "base64");
    flipped[0] ^= 0xff;

    expect(() =>
      decryptToken([version, iv, flipped.toString("base64"), ciphertext].join(":")),
    ).toThrow(TokenCryptoError);
  });

  it("refuses a swapped IV", () => {
    const stored = encryptToken(TOKEN);
    const otherIv = encryptToken(TOKEN).split(":")[1];
    const parts = stored.split(":");

    expect(() => decryptToken([parts[0], otherIv, parts[2], parts[3]].join(":"))).toThrow(
      TokenCryptoError,
    );
  });

  it("refuses an unknown format version", () => {
    const parts = encryptToken(TOKEN).split(":");
    expect(() => decryptToken(["v9", ...parts.slice(1)].join(":"))).toThrow(/unknown format/);
  });

  it("refuses a value that is not in the expected shape at all", () => {
    expect(() => decryptToken("just-a-plain-string")).toThrow(/expected format/);
    expect(() => decryptToken("")).toThrow(TokenCryptoError);
  });
});

describe("the key", () => {
  it("cannot decrypt with a different key", () => {
    // The point of the exercise: a database dump without the key is inert.
    const stored = encryptToken(TOKEN);
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = OTHER_KEY;

    expect(() => decryptToken(stored)).toThrow(TokenCryptoError);
  });

  it("says how to make one when it is missing", () => {
    delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken(TOKEN)).toThrow(/PLAID_TOKEN_ENCRYPTION_KEY is not set/);
    expect(() => encryptToken(TOKEN)).toThrow(/randomBytes\(32\)/);
  });

  it("rejects a key of the wrong length rather than padding it", () => {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = randomBytes(16).toString("base64");
    expect(() => encryptToken(TOKEN)).toThrow(/must decode to 32 bytes, got 16/);
  });

  it("does not distinguish a wrong key from tampering", () => {
    // Saying which one failed tells an attacker which half they got right.
    const stored = encryptToken(TOKEN);
    const parts = stored.split(":");
    const flipped = Buffer.from(parts[3], "base64");
    flipped[0] ^= 0xff;
    const tampered = [parts[0], parts[1], parts[2], flipped.toString("base64")].join(":");

    process.env.PLAID_TOKEN_ENCRYPTION_KEY = OTHER_KEY;
    const wrongKey = (() => {
      try {
        decryptToken(stored);
      } catch (error) {
        return (error as Error).message;
      }
    })();

    process.env.PLAID_TOKEN_ENCRYPTION_KEY = KEY;
    const altered = (() => {
      try {
        decryptToken(tampered);
      } catch (error) {
        return (error as Error).message;
      }
    })();

    expect(wrongKey).toBe(altered);
  });
});

describe("refusals", () => {
  it("will not encrypt an empty token", () => {
    // An empty token means something upstream went wrong; storing it would
    // hide that until a sync silently returned nothing.
    expect(() => encryptToken("")).toThrow(/empty token/);
  });
});

describe("tokensMatch", () => {
  it("compares equal and unequal values correctly", () => {
    expect(tokensMatch(TOKEN, TOKEN)).toBe(true);
    expect(tokensMatch(TOKEN, `${TOKEN}x`)).toBe(false);
    expect(tokensMatch("abc", "abd")).toBe(false);
  });
});
