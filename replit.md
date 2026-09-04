# Moneywise Finance Tracker

Moneywise is a secure, welcoming workspace for tracking income and expenses and understanding monthly profit, savings, and spending patterns.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/moneywise/src/` — React dashboard, landing page, Clerk routes, and transaction flows
- `artifacts/api-server/src/routes/finance.ts` — authenticated finance API and assistant summary logic
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/transactions.ts` — user-scoped transaction schema
- `artifacts/moneywise/src/index.css` — Moneywise visual tokens and responsive styling

## Architecture decisions

- Clerk owns browser authentication and session cookies; the finance API requires the authenticated Clerk user ID.
- Transactions are user-scoped directly by `userId`; no shared or global financial data is exposed.
- New accounts start with no transaction rows and zeroed dashboard totals; all finance data is entered by the account owner.
- OpenAPI remains the single source of truth for generated React Query hooks and Zod validation.

## Product

- Public landing page with branded sign-in and sign-up routes
- Monthly dashboard with total income, total expenses, net profit, savings rate, trend, and expense mix
- Searchable, filterable transaction history with create, edit, and delete
- Plain-language monthly, weekly, spending, affordability, and savings guidance from Moneywise assistant
- Profile, theme preference, and logout settings

## User preferences

The user asked for a great UI, personal or multi-user login, income and expense capture, profit/loss totals, and a chatbot summary.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- Use the artifact workflows for preview; the web app depends on `PORT` and `BASE_PATH`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
