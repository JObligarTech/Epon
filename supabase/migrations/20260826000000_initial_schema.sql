-- E-PON initial schema
--
-- Shape follows Plaid, because that is where the data comes from:
--   profiles  one per auth user
--   items     one bank connection (a Plaid Item)
--   accounts  the accounts inside a connection
--   transactions
--
-- Two rules hold throughout:
--   1. Every table carries user_id and is fenced by row level security. No
--      query path may rely on the application to scope rows to a user.
--   2. Money is bigint minor units. Never numeric-as-float, never a double.

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Application-level user record. auth.users stays owned by Supabase Auth.';

-- ------------------------------------------------------------------- items

create table public.items (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,

  plaid_item_id          text not null,
  plaid_institution_id   text not null,
  institution_name       text not null,

  -- Ciphertext only. The column is named so that storing a raw token reads as
  -- obviously wrong in review. Encryption lands with the Plaid integration.
  access_token_encrypted text,

  -- Which slot of the institution palette this connection uses. Assigned at
  -- connect time as the lowest slot the user is not already using, so a
  -- person's own institutions never collide. Hashing the institution id
  -- instead would collide about seventy percent of the time at four banks.
  hue_index              smallint not null check (hue_index between 0 and 5),

  status                 text not null default 'healthy'
                           check (status in ('healthy', 'reconnect_required')),

  -- Plaid's /transactions/sync cursor. Null means nothing imported yet.
  sync_cursor            text,
  last_synced_at         timestamptz,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Reconnecting must update the existing row, not create a second one.
  unique (user_id, plaid_item_id)
);

create index items_user_id_idx on public.items (user_id);

-- ---------------------------------------------------------------- accounts

create table public.accounts (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  item_id                 uuid not null references public.items (id) on delete cascade,

  plaid_account_id        text not null,
  name                    text not null,
  -- Last four digits only. The full number is never stored.
  mask                    text check (mask is null or char_length(mask) = 4),
  type                    text not null check (type in ('checking', 'savings', 'credit')),

  -- Minor units. For a credit card, current_balance is the amount owed, held
  -- positive, matching Plaid.
  current_balance_minor   bigint not null default 0,
  available_balance_minor bigint,
  credit_limit_minor      bigint,
  apy                     numeric(5, 2),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (user_id, plaid_account_id),
  -- Lets transactions reference (account_id, user_id) together, so a
  -- transaction physically cannot point at another user's account.
  unique (id, user_id)
);

create index accounts_user_id_idx on public.accounts (user_id);
create index accounts_item_id_idx on public.accounts (item_id);

-- ------------------------------------------------------------ transactions

create table public.transactions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  account_id             uuid not null,

  plaid_transaction_id   text not null,
  merchant_name          text not null,

  -- Minor units, negative for money out and positive for money in.
  --
  -- This is the opposite of Plaid, which reports outflow as positive. The sign
  -- is flipped once on ingest so every sum downstream reads as a net change
  -- rather than a total needing negation.
  amount_minor           bigint not null,

  occurred_at            timestamptz not null,
  status                 text not null check (status in ('pending', 'posted')),
  category               text not null,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  unique (user_id, plaid_transaction_id),

  -- The composite reference is the point: it is not possible to attach a
  -- transaction to an account belonging to someone else, whatever the
  -- application does.
  foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade
);

create index transactions_user_id_occurred_at_idx
  on public.transactions (user_id, occurred_at desc);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_status_idx on public.transactions (user_id, status);

-- ------------------------------------------------------------ updated_at

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
-- Empty search_path so the function cannot be hijacked by a schema placed
-- ahead of public by the caller.
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

create trigger accounts_touch_updated_at
  before update on public.accounts
  for each row execute function public.touch_updated_at();

create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------- profile on sign-up

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  -- Sign-up must not fail because a profile somehow already exists.
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------- row level security

alter table public.profiles     enable row level security;
alter table public.items        enable row level security;
alter table public.accounts     enable row level security;
alter table public.transactions enable row level security;

-- Applies the policies to the table owner as well, not only to other roles.
-- The service role still bypasses RLS, which is why it is confined to webhook
-- handlers that have no user to act on behalf of.
alter table public.profiles     force row level security;
alter table public.items        force row level security;
alter table public.accounts     force row level security;
alter table public.transactions force row level security;

-- profiles: a person may read and edit their own, and nothing else. Inserts
-- come from the sign-up trigger, which is security definer, so no insert
-- policy is granted here.
create policy "profiles: select own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- items, accounts, transactions: full access to your own rows only.
-- with check is stated on every write policy as well as using, or a row could
-- be written with someone else's user_id.
create policy "items: all own"
  on public.items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "accounts: all own"
  on public.accounts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "transactions: all own"
  on public.transactions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
