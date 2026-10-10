# E-commerce Admin Dashboard

Admin dashboard for the Zariny e-commerce backend: pnpm + Turborepo monorepo, Next.js (App Router) web app, shared UI package, and a typed GraphQL client generated from the live backend schema.

## Structure

```
apps/web               # Next.js app (dashboard UI, login, /api/graphql proxy)
packages/ui            # Shared component library (shadcn-style, Base UI primitives)
packages/graphql       # GraphQL documents + generated TypedDocumentNode client
packages/*             # Shared eslint / typescript configs
scripts/               # Internal dev tools (permission probes, smoke test)
```

- **`apps/web`** — dashboard pages under `app/dashboard/*` (users, products, variants, product classes, attributes, categories), JWT cookie auth, and a Route Handler proxy at `app/api/graphql/route.ts` that handles the backend's CSRF dance (csrftoken cookie + `X-CSRFToken` + `Referer` headers), whitelists forwarded cookies, and strips `Domain=` from backend `Set-Cookie` headers.
- **`packages/graphql`** — hand-written `.graphql` documents in `src/`; `schema.json.graphql` is the SDL snapshot fetched from the backend; codegen (client preset) emits `src/gql/` with fully typed documents.

## Getting started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in real values
pnpm dev                                       # starts apps/web on :3000
```

Open http://localhost:3000/login and sign in with a dashboard account.

### Common commands (root, via Turbo)

| Command         | Purpose                                            |
| --------------- | -------------------------------------------------- |
| `pnpm dev`      | Run the web app in dev mode                        |
| `pnpm build`    | Production build of all packages                   |
| `pnpm lint`     | ESLint across the monorepo                         |
| `pnpm typecheck`| TypeScript across the monorepo                     |
| `pnpm format`   | Prettier                                           |
| `pnpm codegen`  | Regenerate the typed GraphQL client from the SDL   |

To refresh the schema snapshot after a backend change:

```bash
pnpm --filter @workspace/graphql fetch-schema   # GET GraphiQL page → POST introspection → SDL
pnpm codegen
```

## Environment variables (`apps/web/.env.local`)

| Key                        | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `GRAPHQL_BACKEND_ENDPOINT` | Backend GraphQL URL (server-only; never exposed to the client)   |
| `GRAPHQL_PROXY_PATH`       | Same-origin proxy path for the browser (default `/api/graphql`)  |
| `SESSION_COOKIE_NAME`      | Access-token cookie name used by the `proxy.ts` auth gate        |
| `SESSION_COOKIE_NAMES`     | Extra cookies forwarded to the backend (comma-separated, e.g. `refresh`) |
| `DASHBOARD_EMAIL`          | Dev login credentials — **never commit**                         |
| `DASHBOARD_PASSWORD`       | Dev login credentials — **never commit**                         |

## Known backend limitations

- **Trusted TLS required** — the GraphQL/media proxies use strict TLS verification in every environment (dev and production alike). The backend must serve `GRAPHQL_BACKEND_ENDPOINT` with a publicly trusted certificate (domain + Let's Encrypt, not bare-IP self-signed), otherwise login fails with `Backend unreachable: fetch failed`.
- **Test endpoint trap** — `/graphql/` serves an empty schema (`Query.test` only). The real dashboard API lives at `/dashboard/graphql/`.
- **Locked fields** — the service account lacks `GROUP_MANAGER` / `CATALOGUE_MANAGER` / `PERMISSION_MANAGER` / `CHECK_SUPERUSER_STATUS`: `id` is locked on most models, and `categories` / `permissions` lists are fully locked. Queries omit locked fields; tables key rows by index.
- **Products access changed** — `products` is now readable (previously locked behind `GROUP_MANAGER`) with only `id` locked; `totalCount` = 151.
- **Auth is cookie-based JWT** — `login`/`logout`/`refresh` mutations return `{ok, status, message, expireDate}` with HTTP 200 even on failure; clients must check the payload, not the status code.
- **Empty data** — `groups` currently returns zero rows.

## Branching & commits

Feature work happens on `feat/*`, `fix/*`, `chore/*` branches with Conventional Commits; `main` is never committed to directly.
