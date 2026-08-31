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

## Running a database locally

Needs Docker. On a Mac without Docker Desktop, `colima start` provides it.

```bash
npm run db:start    # first run pulls several GB
npm run db:verify   # proves user isolation, see below
npm run db:stop
```

Studio is excluded from `db:start`. Under Colima it fails to mount its snippets
directory — an sshfs `chown` restriction, nothing to do with the schema — and
it is only the web UI. Use `psql` for a look inside:

```bash
docker exec supabase_db_epon psql -U postgres -d postgres -c '\dt public.*'
```

## Verifying isolation

`npm run db:verify` creates two users and checks that neither can reach the
other's rows. It has to pass before this schema is trusted with real data.

```
PASS  a profile row is created on sign-up
PASS  a user can write their own rows
PASS  a user can write an account under their own item
PASS  another user reads none of it, and is not shown an error
PASS  another user cannot change it
PASS  another user cannot delete it
PASS  a transaction cannot be attached to someone else's account
PASS  a user cannot write a row carrying another user's id
PASS  the owner still sees their own rows
```

Two of those are the ones worth understanding:

**"reads none of it, and is not shown an error"** — RLS filters rows, it does
not raise. A blocked read returning empty is correct; a blocked read returning
an error means something other than RLS is failing.

**"cannot write a row carrying another user's id"** — this is what `with check`
buys. Without it a policy passes the read test and still lets a user insert
rows belonging to someone else.
