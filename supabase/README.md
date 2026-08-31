# Database

`migrations/` holds the schema. Apply it either way:

**Supabase dashboard** — SQL Editor, paste the migration, run it. Fine for a
first apply.

**Supabase CLI** — better once there is more than one migration, because it
tracks what has already run:

```bash
npm install -D supabase
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then regenerate the types, which are currently hand-written:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## What the schema guarantees

**Row level security is on, and forced, for every table.** Forced means the
policies apply to the table owner too, not only to other roles. The service
role still bypasses RLS — which is exactly why it is confined to webhook
handlers, which arrive with no user to act on behalf of.

**Write policies state `with check` as well as `using`.** Without it a user
could pass the read check and still write a row carrying someone else's
`user_id`.

**A transaction cannot be attached to another user's account.** `transactions`
references `accounts (id, user_id)` as a composite foreign key, so the database
rejects the mismatch regardless of what the application asks for.

**Money is `bigint` minor units.** Never `float`, never `numeric` treated as a
float in JavaScript.

**Access tokens are stored as ciphertext.** The column is
`access_token_encrypted` so that putting a raw token in it reads as wrong in
review. Encryption arrives with the Plaid integration.

**Profiles are created by a trigger on sign-up**, so there is no window in
which a signed-in user has no profile row. The function is `security definer`
with an empty `search_path`, so it cannot be hijacked by a schema placed ahead
of `public`.

## Verifying isolation after applying

Worth doing once, by hand, with two accounts:

1. Sign in as user A, insert an item, note its id.
2. Sign in as user B and `select * from items` — it must come back empty, not
   error. RLS filters rows; it does not raise.
3. As user B, try to update user A's row by id. Zero rows affected.
