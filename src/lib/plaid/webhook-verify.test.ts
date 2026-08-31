/**
 * @vitest-environment node
 *
 * Signs real tokens with a generated key pair, so these exercise the actual
 * verification rather than a stubbed one. Plaid's key endpoint is the only
 * thing mocked — it is the network, not the logic.
 */
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ key: null as unknown, calls: 0 }));

vi.mock("./client", () => ({
  plaidClient: () => ({
    webhookVerificationKeyGet: async () => {
      mocks.calls += 1;
      return { data: { key: mocks.key } };
    },
  }),
}));

import {
  clearVerificationKeyCache,
  hashBody,
  verifyWebhook,
  WebhookVerificationError,
} from "./webhook-verify";

const BODY = JSON.stringify({ webhook_type: "TRANSACTIONS", item_id: "item-1" });
const NOW = new Date("2026-08-31T12:00:00.000Z");

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  mocks.key = { ...(await exportJWK(pair.publicKey)), kid: "key-1", alg: "ES256", use: "sig" };

  const other = await generateKeyPair("ES256", { extractable: true });
  otherPrivateKey = other.privateKey;
});

beforeEach(() => {
  clearVerificationKeyCache();
  mocks.calls = 0;
});

async function sign(
  options: {
    body?: string;
    issuedAt?: number;
    key?: CryptoKey;
    kid?: string;
    hash?: string;
  } = {},
) {
  const issuedAt = options.issuedAt ?? Math.floor(NOW.getTime() / 1000);
  return new SignJWT({ request_body_sha256: options.hash ?? hashBody(options.body ?? BODY) })
    .setProtectedHeader({ alg: "ES256", kid: options.kid ?? "key-1" })
    .setIssuedAt(issuedAt)
    .sign(options.key ?? privateKey);
}

describe("a genuine webhook", () => {
  it("verifies", async () => {
    await expect(verifyWebhook(await sign(), BODY, NOW)).resolves.toBeUndefined();
  });

  it("fetches the key once and reuses it", async () => {
    await verifyWebhook(await sign(), BODY, NOW);
    await verifyWebhook(await sign(), BODY, NOW);
    expect(mocks.calls).toBe(1);
  });
});

describe("rejections", () => {
  it("refuses a missing header", async () => {
    await expect(verifyWebhook(null, BODY, NOW)).rejects.toThrow(/Missing Plaid-Verification/);
  });

  it("refuses something that is not a JWT", async () => {
    await expect(verifyWebhook("not-a-jwt", BODY, NOW)).rejects.toThrow(WebhookVerificationError);
  });

  it("refuses a token signed by someone else", async () => {
    const forged = await sign({ key: otherPrivateKey });
    await expect(verifyWebhook(forged, BODY, NOW)).rejects.toThrow(/Signature did not verify/);
  });

  it("refuses a body that does not match the signed hash", async () => {
    // The signature is genuine, but the payload was swapped after signing.
    const token = await sign({ body: BODY });
    const tampered = JSON.stringify({ webhook_type: "TRANSACTIONS", item_id: "someone-elses" });

    await expect(verifyWebhook(token, tampered, NOW)).rejects.toThrow(/does not match/);
  });

  it("refuses a token old enough to be a replay", async () => {
    const old = await sign({ issuedAt: Math.floor(NOW.getTime() / 1000) - 600 });
    await expect(verifyWebhook(old, BODY, NOW)).rejects.toThrow(/expired or not yet valid/);
  });

  it("refuses a token issued in the future", async () => {
    const future = await sign({ issuedAt: Math.floor(NOW.getTime() / 1000) + 600 });
    await expect(verifyWebhook(future, BODY, NOW)).rejects.toThrow(/expired or not yet valid/);
  });

  it("refuses a token with no issued-at at all", async () => {
    const token = await new SignJWT({ request_body_sha256: hashBody(BODY) })
      .setProtectedHeader({ alg: "ES256", kid: "key-1" })
      .sign(privateKey);

    await expect(verifyWebhook(token, BODY, NOW)).rejects.toThrow(/expired or not yet valid/);
  });

  it("refuses a token carrying no body hash", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: "key-1" })
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .sign(privateKey);

    await expect(verifyWebhook(token, BODY, NOW)).rejects.toThrow(/no body hash/);
  });

  it("refuses a header with no key id", async () => {
    const token = await new SignJWT({ request_body_sha256: hashBody(BODY) })
      .setProtectedHeader({ alg: "ES256" })
      .setIssuedAt(Math.floor(NOW.getTime() / 1000))
      .sign(privateKey);

    await expect(verifyWebhook(token, BODY, NOW)).rejects.toThrow(/no key id/);
  });

  it("refuses alg=none rather than trusting the token's own claim", async () => {
    // The classic JWT attack: if the algorithm is taken from the token, an
    // attacker simply says there is no signature to check.
    const [, payload] = (await sign()).split(".");
    const unsigned = `${Buffer.from(JSON.stringify({ alg: "none", kid: "key-1" })).toString(
      "base64url",
    )}.${payload}.`;

    await expect(verifyWebhook(unsigned, BODY, NOW)).rejects.toThrow(
      /Unexpected signing algorithm/,
    );
  });
});

describe("hashBody", () => {
  it("hashes the exact bytes, not a re-serialised object", () => {
    // Re-serialising normalises whitespace, and the hash stops matching what
    // Plaid signed over the bytes it actually sent.
    const a = '{ "webhook_type": "TRANSACTIONS" }';
    const b = JSON.stringify(JSON.parse(a));

    expect(a).not.toBe(b);
    expect(hashBody(a)).not.toBe(hashBody(b));
  });
});
