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
npm run dev
```

Then open http://localhost:3000.

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

## Conventions

- Plaid access tokens never reach the browser. They are exchanged server-side
  and stored encrypted.
- Every table carries a user id and is protected by row level security. No query
  path may rely on the client to scope data to a user.
- Amounts are stored in minor units (integer cents), never floats.
