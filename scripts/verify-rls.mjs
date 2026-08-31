/**
 * Proves user isolation against a real database.
 *
 * Policies that look right and policies that are right diverge more often than
 * is comfortable, and the failure is silent — everything works until two people
 * use it. This creates two users and checks that neither can see, change, or
 * attach anything to the other's rows.
 *
 * Run against the LOCAL stack only: it creates and deletes users.
 *   npx supabase start && node scripts/verify-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

function localCredentials() {
  const raw = execSync("npx supabase status -o env", { encoding: "utf8" });
  const read = (key) => {
    const match = new RegExp(`^${key}="?([^"\\n]+)"?$`, "m").exec(raw);
    if (!match) throw new Error(`${key} missing from supabase status`);
    return match[1];
  };
  return {
    url: read("API_URL"),
    anonKey: read("ANON_KEY"),
    serviceKey: read("SERVICE_ROLE_KEY"),
  };
}

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  PASS" : "  FAIL"}  ${name}${detail ? `\n        ${detail}` : ""}`);
}

const { url, anonKey, serviceKey } = localCredentials();
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const password = "verify-rls-passphrase-1";
const people = [
  { label: "A", email: `rls-a-${Date.now()}@example.test` },
  { label: "B", email: `rls-b-${Date.now()}@example.test` },
];

console.log("\nRow level security verification\n");

for (const person of people) {
  const { data, error } = await admin.auth.admin.createUser({
    email: person.email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`could not create user ${person.label}: ${error.message}`);
  person.id = data.user.id;

  person.client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signIn = await person.client.auth.signInWithPassword({ email: person.email, password });
  if (signIn.error) throw new Error(`could not sign in ${person.label}: ${signIn.error.message}`);
}

const [a, b] = people;

// The sign-up trigger should have made a profile for each.
const profile = await a.client.from("profiles").select("*").eq("id", a.id).single();
check("a profile row is created on sign-up", !profile.error && profile.data?.id === a.id,
  profile.error?.message);

// A owns an item and an account.
const item = await a.client.from("items").insert({
  user_id: a.id,
  plaid_item_id: `item-${a.id}`,
  plaid_institution_id: "ins_test",
  institution_name: "Northstar Bank",
  hue_index: 0,
}).select().single();
check("a user can write their own rows", !item.error, item.error?.message);

const account = await a.client.from("accounts").insert({
  user_id: a.id,
  item_id: item.data.id,
  plaid_account_id: `acct-${a.id}`,
  name: "Everyday Checking",
  mask: "4417",
  type: "checking",
  current_balance_minor: 784219,
}).select().single();
check("a user can write an account under their own item", !account.error, account.error?.message);

// --- the isolation checks ---

const bReadsA = await b.client.from("items").select("*");
check("another user reads none of it, and is not shown an error",
  !bReadsA.error && (bReadsA.data ?? []).length === 0,
  bReadsA.error ? `errored instead of filtering: ${bReadsA.error.message}` : `saw ${bReadsA.data?.length} rows`);

const bUpdatesA = await b.client.from("items")
  .update({ institution_name: "Taken Over" }).eq("id", item.data.id).select();
check("another user cannot change it",
  !bUpdatesA.error && (bUpdatesA.data ?? []).length === 0,
  `${bUpdatesA.data?.length ?? 0} rows affected`);

const bDeletesA = await b.client.from("accounts").delete().eq("id", account.data.id).select();
check("another user cannot delete it",
  !bDeletesA.error && (bDeletesA.data ?? []).length === 0,
  `${bDeletesA.data?.length ?? 0} rows affected`);

// The one a policy alone would not stop.
const bStealsAccount = await b.client.from("transactions").insert({
  user_id: b.id,
  account_id: account.data.id,
  plaid_transaction_id: `txn-${b.id}`,
  merchant_name: "Not mine",
  amount_minor: -100,
  occurred_at: new Date().toISOString(),
  status: "posted",
  category: "Dining",
});
check("a transaction cannot be attached to someone else's account",
  Boolean(bStealsAccount.error),
  bStealsAccount.error ? "" : "the insert succeeded, which is a cross-user write");

// Writing a row that claims to belong to someone else.
const bWritesAsA = await a.client.from("items").insert({
  user_id: b.id,
  plaid_item_id: `forged-${Date.now()}`,
  plaid_institution_id: "ins_test",
  institution_name: "Forged",
  hue_index: 1,
});
check("a user cannot write a row carrying another user's id",
  Boolean(bWritesAsA.error),
  bWritesAsA.error ? "" : "with check is missing from the insert policy");

// A still sees their own.
const aReadsOwn = await a.client.from("items").select("*");
check("the owner still sees their own rows",
  !aReadsOwn.error && (aReadsOwn.data ?? []).length === 1,
  aReadsOwn.error?.message);

for (const person of people) await admin.auth.admin.deleteUser(person.id);

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length === 0 ? 0 : 1);
