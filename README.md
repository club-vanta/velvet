# velvet — Alter Tracker Frontend

Staff portal for Club Vanta's Alter meetup door management. Checks people in, manages the guest list, tracks arrivals.

**Tech Stack:** React 19 + TypeScript (strict), Vite, Tailwind v4, shadcn/ui, React Router v7, TanStack Query v5, openapi-fetch

**API Documentation:** Backend at `api-alter-tracker.club-vanta.com/docs` — or run locally (see backend README).

**User and domain documentation:** [docs.club-vanta.com](https://docs.club-vanta.com)

---

## Quick Start

```bash
# Install dependencies
npm install

# Install pre-commit hooks
pre-commit install

# Copy env file (optional — defaults to production backend)
cp .env.example .env.local

# Start dev server
npm run dev
# -> http://localhost:5200

# If port 5200 is taken, Vite tries 5201, 5202...
```

> **Phone/LAN testing:** set `VITE_API_BASE_URL=http://<your-mac-ip>:8000` in `.env.local` and make sure the backend CORS list includes your Vite port. Revert to `localhost:8000` for normal Mac dev.

---

## API Types

Types are auto-generated from the backend OpenAPI schema. Regenerate whenever the backend API changes:

```bash
# Preferred: backend running locally
npm run generate:api

# Or directly from deployed URL (not recommended, the backend infrastructure is usually down in order to save costs)
npx openapi-typescript https://api-alter-tracker.club-vanta.com/openapi.json -o src/api/types.ts
```

Commit the updated `src/api/types.ts`. If the backend changes an endpoint and you don't regenerate, the frontend will fail to compile at every stale callsite.

---

## Available Commands

| Script                  | What it does                                                |
| ----------------------- | ----------------------------------------------------------- |
| `npm run dev`           | Dev server at `localhost:5200` with HMR                     |
| `npm run build`         | Production build -> `dist/` (what Cloudflare Pages runs)    |
| `npm run preview`       | Preview production build locally                            |
| `npm run typecheck`     | TypeScript check only (app, tooling and Cypress projects)   |
| `npm run lint`          | ESLint (includes the import-layering and Cypress rules)     |
| `npm run format`        | Prettier (write)                                            |
| `npm run format:check`  | Prettier (check)                                            |
| `npm run check`         | Full quality gate: typecheck + prettier + eslint            |
| `npm run test`          | Vitest watch mode                                           |
| `npm run test:run`      | Vitest single run (CI)                                      |
| `npm run test:coverage` | Vitest with coverage -> `coverage/unit`                     |
| `npm run test:ct`       | Cypress component tests (`src/**/*.cy.tsx`)                 |
| `npm run test:e2e`      | Cypress E2E with a stubbed API (starts `dev:e2e` itself)    |
| `npm run test:smoke`    | Cypress smoke suite against a real local backend            |
| `npm run dev:e2e`       | Dev server in `e2e` mode, for `npm run cy:open`             |
| `npm run cy:open`       | Cypress interactive runner                                  |
| `npm run coverage`      | Unit + E2E + component coverage, merged into `coverage/all` |
| `npm run generate:api`  | Regenerate `src/api/types.ts` from backend schema           |

Testing conventions (selectors, stubs, factories, which tool for what) are in
[`cypress/README.md`](cypress/README.md).

---

## Project Structure

```
src/
├── main.tsx               <- entry: React Query client, router
├── app/                   <- route table (App.tsx) and Shell layout
├── features/              <- one folder per area, each with an index.ts
│   ├── auth/              <- login, signup, password recovery
│   ├── dashboard/         <- /dashboard
│   ├── meetups/           <- /meetups, /meetups/:id (the door)
│   ├── guests/            <- /guests, /guests/:guestId
│   ├── stats/             <- /stats (org admins; lazy-loaded with recharts)
│   ├── staff/             <- /staff (site admins)
│   ├── organizations/     <- /organizations (org admins)
│   └── events/            <- /events, the audit log (org admins)
├── domain/                <- logic shared by features: session, guest, meetup
├── components/            <- shared UI; ui/ holds the shadcn/ui sources
├── hooks/                 <- generic React hooks
├── lib/                   <- generic utilities; i18n/ holds the translations
├── api/
│   ├── client.ts          <- openapi-fetch instance + auth middleware
│   ├── queryKeys.ts       <- TanStack Query keys and invalidation helpers
│   └── types.ts           <- auto-generated, never edit manually
└── tests/
    ├── setup.ts           <- Vitest setup
    └── factories/         <- typed API payload factories (Vitest and Cypress)
cypress/                   <- E2E specs and support code (see cypress/README.md)
```

Each feature folder has `components/`, `api/` (query hooks), `hooks/` and
`lib/` (pure logic) as needed. The layering rules and where new code goes are
in [`CLAUDE.md`](CLAUDE.md#code-map); ESLint enforces the import rules.

---

## Auth

JWT is stored in **localStorage** under the key `auth_token` and persists across page reloads. On mount, `AuthContext` calls `GET /auth/userinfo` with the stored token to re-hydrate the session. If the server returns 401, the token is cleared and the user is redirected to login.

The token is injected as `Authorization: Bearer <token>` on every request via middleware in `api/client.ts`.

---

## Environment Variables

| Variable            | Purpose              | Default                                    |
| ------------------- | -------------------- | ------------------------------------------ |
| `VITE_API_BASE_URL` | Backend API base URL | `https://api-alter-tracker.club-vanta.com` |

Copy `.env.example` -> `.env.local` to override for local dev.

---

## Deployment

Cloudflare Pages. Build command: `npm run build`. Output: `dist/`. No special config needed.
