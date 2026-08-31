# E-PON

A personal finance app: connect your bank and credit-card accounts, import
transactions automatically, and see what you actually have.

E-PON is *Electronic Personal-finance Organization & Navigation*, and *ipon* —
to save up.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | CSS custom properties + CSS Modules |
| Database / auth | Supabase (Postgres, row level security) |
| Bank data | Plaid |
| Hosting | Vercel |

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Then open http://localhost:3000.

The app runs on mock data until the database is wired up, so it starts without
any environment variables. Supabase values are read lazily and validated at the
point of use: a missing variable breaks the feature that needs it, with a
message naming the variable, rather than failing the build.

## Environment variables

See `.env.example` for the full list and where each one comes from. Set them in
Vercel under Project → Settings → Environment Variables, for Production,
Preview and Development.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` reaches the browser by design.
`SUPABASE_SERVICE_ROLE_KEY` never does — it bypasses row level security and is
reserved for webhook handlers, which arrive with no user session.

## Database

`supabase/migrations` holds the schema, and `supabase/README.md` explains how to
apply it and what it guarantees. Every table carries a user id and is fenced by
row level security; no query path relies on the application to scope rows.

## Design reference

`design/prototype.html` is the approved interactive design prototype — a single
self-contained file with no build step. Open it directly in a browser. It is the
source of truth for layout, colour, typography and interaction; the app is a
port of it, not a reinterpretation.

Its two data palettes were validated for colour-vision separation and contrast
in both themes. Do not hand-edit those values.

## Build order

Shipped in small deployable commits, six milestones:

1. **M0 — Pipeline.** Init, then the design system.
2. **M1 — Design on mock data.** App shell, mock data layer, Home, Accounts,
   Transactions. At the end of this milestone the prototype is a real app.
3. **M2 — Auth.** Supabase clients, schema + row level security, real sign-in.
4. **M3 — Your own data.** Read from Postgres, seed demo rows, empty states.
5. **M4 — Plaid.** Link token and exchange, account import, transaction sync,
   webhooks, reconnect and remove.
6. **M5 — Ship V1.** Settings, loading and error states, hardening.

Every commit deploys. Some change nothing visible — that is expected.

## Testing

```bash
npm test          # unit and component tests, with axe assertions
npm run test:e2e  # real-browser accessibility audits, both themes
npm run typecheck # generates route types first, then tsc
npm run lint
```

Accessibility is checked in two places because one is not enough. jsdom does no
layout or painting, so axe skips colour contrast there entirely; those rules
only run in the Playwright suite, against a production build, in both themes.

## Conventions

- Plaid access tokens never reach the browser. They are exchanged server-side
  and stored encrypted.
- Every table carries a user id and is protected by row level security. No query
  path may rely on the client to scope data to a user.
- Amounts are stored in minor units (integer cents), never floats.
