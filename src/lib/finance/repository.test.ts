/**
 * @vitest-environment node
 *
 * The repository is server-only; these assertions are about what it asks the
 * database for and what it does with the answer.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hasConfig: vi.fn(() => true),
  user: null as { id: string } | null,
  responses: {} as Record<
    string,
    { data?: unknown[] | null; error?: { code: string; message: string } | null }
  >,
  queries: [] as { table: string; filters: Record<string, unknown> }[],
}));

vi.mock("@/lib/env", () => ({ hasSupabaseConfig: mocks.hasConfig }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => mocks.user }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      const record = { table, filters: {} as Record<string, unknown> };
      mocks.queries.push(record);
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq(column: string, value: unknown) {
          record.filters[column] = value;
          return chain;
        },
        then: (resolve: (value: unknown) => void) =>
          resolve(mocks.responses[table] ?? { data: [], error: null }),
      };
      return chain;
    },
  }),
}));

import { isEmpty, loadDataset } from "./repository";

const NOW = new Date(2026, 7, 25, 14, 30);

beforeEach(() => {
  mocks.hasConfig.mockReturnValue(true);
  mocks.user = { id: "user-1" };
  mocks.responses = {};
  mocks.queries = [];
});

describe("loadDataset", () => {
  it("falls back to sample data when Supabase is not configured", async () => {
    // The product still has to be usable and reviewable before the database
    // exists, rather than showing a wall of errors.
    mocks.hasConfig.mockReturnValue(false);
    const { dataset, source } = await loadDataset(NOW);

    expect(source).toBe("mock");
    expect(dataset.accounts.length).toBeGreaterThan(0);
  });

  it("returns nothing for a signed-out visitor rather than sample data", async () => {
    // Showing invented balances to someone with no session would be worse than
    // showing nothing.
    mocks.user = null;
    const { dataset, source } = await loadDataset(NOW);

    expect(source).toBe("database");
    expect(dataset).toEqual({ institutions: [], accounts: [], transactions: [] });
  });

  it("scopes every query to the signed-in user", async () => {
    // Row level security is the real fence, but the explicit filter is belt as
    // well as braces, and it lets Postgres use the user_id indexes.
    await loadDataset(NOW);

    expect(mocks.queries.map((q) => q.table).sort()).toEqual([
      "accounts",
      "items",
      "transactions",
    ]);
    for (const query of mocks.queries) {
      expect(query.filters.user_id).toBe("user-1");
    }
  });

  it("maps rows into the shapes the screens already use", async () => {
    mocks.responses = {
      items: {
        data: [
          {
            id: "item-1",
            user_id: "user-1",
            plaid_item_id: "p1",
            plaid_institution_id: "ins",
            institution_name: "Northstar Bank",
            access_token_encrypted: "ciphertext",
            hue_index: 0,
            status: "healthy",
            sync_cursor: null,
            last_synced_at: "2026-08-25T14:00:00.000Z",
            created_at: "2026-08-01T00:00:00.000Z",
            updated_at: "2026-08-25T14:00:00.000Z",
          },
        ],
        error: null,
      },
    };

    const { dataset } = await loadDataset(NOW);
    expect(dataset.institutions[0]).toMatchObject({
      name: "Northstar Bank",
      hue: "marine",
      status: "healthy",
    });
  });

  it("never lets an access token reach the shape handed to the browser", async () => {
    mocks.responses = {
      items: {
        data: [
          {
            id: "item-1",
            user_id: "user-1",
            plaid_item_id: "p1",
            plaid_institution_id: "ins",
            institution_name: "Northstar Bank",
            access_token_encrypted: "super-secret-token",
            hue_index: 0,
            status: "healthy",
            sync_cursor: null,
            last_synced_at: null,
            created_at: "2026-08-01T00:00:00.000Z",
            updated_at: "2026-08-01T00:00:00.000Z",
          },
        ],
        error: null,
      },
    };

    const { dataset } = await loadDataset(NOW);
    expect(JSON.stringify(dataset)).not.toContain("super-secret-token");
  });

  it("raises a readable failure without leaking schema detail", async () => {
    mocks.responses = {
      accounts: {
        data: null as unknown as unknown[],
        error: { code: "42501", message: 'permission denied for table "accounts"' },
      },
    };

    await expect(loadDataset(NOW)).rejects.toThrow(/Could not load your accounts/);
    await expect(loadDataset(NOW)).rejects.not.toThrow(/permission denied/);
  });
});

describe("isEmpty", () => {
  it("is true only when there are no accounts", () => {
    expect(isEmpty({ institutions: [], accounts: [], transactions: [] })).toBe(true);
    expect(
      isEmpty({
        institutions: [],
        accounts: [{ id: "a" } as never],
        transactions: [],
      }),
    ).toBe(false);
  });
});
