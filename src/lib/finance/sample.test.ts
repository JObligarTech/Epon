import { describe, expect, it } from "vitest";
import { institutionFromRow } from "./mappers";
import { isSampleItemId, SAMPLE_PREFIX, sampleItemId } from "./sample";
import type { ItemRow } from "@/lib/supabase/database.types";

const row: ItemRow = {
  id: "item-1",
  user_id: "user-1",
  plaid_item_id: "real-plaid-item-id",
  plaid_institution_id: "ins_1",
  institution_name: "Northstar Bank",
  access_token_encrypted: null,
  hue_index: 0,
  status: "healthy",
  sync_cursor: null,
  last_synced_at: null,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};

describe("sample item ids", () => {
  it("round-trips a marked id", () => {
    const id = sampleItemId("ins_northstar");
    expect(id).toBe(`${SAMPLE_PREFIX}ins_northstar`);
    expect(isSampleItemId(id)).toBe(true);
  });

  it("does not mistake a real Plaid item id for a sample", () => {
    // Real ids look like "eV1BvpDxbNCLNoLwAgpluaRxx7BqmgSPqgQPD".
    expect(isSampleItemId("eV1BvpDxbNCLNoLwAgpluaRxx7BqmgSPqgQPD")).toBe(false);
    expect(isSampleItemId("")).toBe(false);
  });

  it("does not match the prefix appearing later in the id", () => {
    expect(isSampleItemId(`plaid-${SAMPLE_PREFIX}nope`)).toBe(false);
  });
});

describe("isSample on the mapped institution", () => {
  it("is false for a real connection", () => {
    expect(institutionFromRow(row).isSample).toBe(false);
  });

  it("is true for one that was loaded from the sample set", () => {
    // The UI relies on this to label invented balances, so they can never be
    // mistaken for a real bank.
    const sample = { ...row, plaid_item_id: sampleItemId("ins_northstar") };
    expect(institutionFromRow(sample).isSample).toBe(true);
  });
});
