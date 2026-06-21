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
# -> http://localhost:5173

# If port 5173 is taken by another project
npx vite --port 5200 --host
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

| Script                 | What it does                                             |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Dev server at `localhost:5173` with HMR                  |
| `npm run build`        | Production build -> `dist/` (what Cloudflare Pages runs) |
| `npm run preview`      | Preview production build locally                         |
| `npm run typecheck`    | TypeScript check only                                    |
| `npm run lint`         | ESLint                                                   |
| `npm run format`       | Prettier (write)                                         |
| `npm run format:check` | Prettier (check)                                         |
| `npm run check`        | Full quality gate: typecheck + prettier + eslint         |
| `npm run test`         | Vitest watch mode                                        |
| `npm run test:run`     | Vitest single run (CI)                                   |
| `npm run test:e2e`     | Playwright E2E                                           |
| `npm run generate:api` | Regenerate `src/api/types.ts` from backend schema        |

---

## Project Structure

```
src/
├── api/
│   ├── client.ts          <- openapi-fetch instance + auth middleware
│   └── types.ts           <- auto-generated — never edit manually
├── auth/
│   ├── AuthContext.tsx    <- JWT auth state, login/logout, useAuth()
│   └── LoginPage.tsx      <- login screen
├── layout/
│   └── Shell.tsx          <- topbar + sidebar + role-based nav
├── features/
│   ├── dashboard/         <- /dashboard
│   ├── meetups/           <- /meetups, /meetups/:id
│   ├── guests/            <- /guests
│   ├── staff/             <- /staff (admin only)
│   └── events/            <- /events (admin only)
├── components/ui/         <- shadcn/ui components (source, not a package)
├── lib/
│   ├── utils.ts           <- shadcn cn() helper
│   └── format.ts          <- date formatting (es-AR locale)
└── tests/
    ├── setup.ts
    └── e2e/               <- Playwright tests
```

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
