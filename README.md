# velvet — Alter Tracker Frontend

Staff portal for Club Vanta's Alter meetup door management. Checks people in, manages the guest list, tracks arrivals.

**Tech Stack:** React 19 + TypeScript (strict), Vite, Tailwind v4, shadcn/ui, React Router v7, TanStack Query v5, openapi-fetch

**API Documentation:** Backend at `api-alter-tracker.club-vanta.com/docs` — or run locally (see backend README).

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
# → http://localhost:5173

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

| Script                 | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Dev server at `localhost:5173` with HMR                 |
| `npm run build`        | Production build → `dist/` (what Cloudflare Pages runs) |
| `npm run preview`      | Preview production build locally                        |
| `npm run typecheck`    | TypeScript check only                                   |
| `npm run lint`         | ESLint                                                  |
| `npm run format`       | Prettier (write)                                        |
| `npm run format:check` | Prettier (check)                                        |
| `npm run check`        | Full quality gate: typecheck + prettier + eslint        |
| `npm run test`         | Vitest watch mode                                       |
| `npm run test:run`     | Vitest single run (CI)                                  |
| `npm run test:e2e`     | Playwright E2E                                          |
| `npm run generate:api` | Regenerate `src/api/types.ts` from backend schema       |

---

## Project Structure

```
src/
├── api/
│   ├── client.ts          ← openapi-fetch instance + auth middleware
│   └── types.ts           ← auto-generated — never edit manually
├── auth/
│   ├── AuthContext.tsx    ← memory-only JWT, login/logout, useAuth()
│   └── LoginPage.tsx      ← login screen
├── layout/
│   └── Shell.tsx          ← topbar + sidebar + role-based nav
├── features/
│   ├── dashboard/         ← /dashboard
│   ├── meetups/           ← /meetups, /meetups/:id
│   ├── guests/            ← /guests
│   ├── staff/             ← /staff (admin only)
│   └── events/            ← /events (admin only)
├── components/ui/         ← shadcn/ui components (source, not a package)
├── lib/
│   ├── utils.ts           ← shadcn cn() helper
│   └── format.ts          ← date formatting (es-AR locale)
└── tests/
    ├── setup.ts
    └── e2e/               ← Playwright tests
```

---

## Auth

JWT is stored **in memory only** — not localStorage. The token is cleared on page reload; staff log in once per session. This is intentional per the project spec.

The token is held in a module-level variable in `api/client.ts` and injected as `Authorization: Bearer <token>` on every request via middleware. `AuthContext` manages the React user state and calls `setAuthToken()` on login/logout.

---

## Environment Variables

| Variable            | Purpose              | Default                                    |
| ------------------- | -------------------- | ------------------------------------------ |
| `VITE_API_BASE_URL` | Backend API base URL | `https://api-alter-tracker.club-vanta.com` |

Copy `.env.example` → `.env.local` to override for local dev.

---

## Password Recovery

The app has no email-based password reset. Recovery is handled manually: an admin generates a 6-digit code and communicates it to the user out-of-band (WhatsApp, Slack, etc.).

**Admin side:**

On the Staff management panel, each row has a "Forgot password" button. Clicking it opens a confirmation modal. On confirm, the backend generates a 6-digit code tied to that user's account. If there was already a pending code, it is replaced immediately. The admin reads the code from the modal and tells it to the user.

**User side:**

On the login screen there is a "Forgot your password?" link. It leads to a form where the user enters their username and the code. If the code is valid, they are taken to a new-password screen. Once they save successfully, a confirmation message is shown and they can go back to login.

**Business rules:**

- The code does **not** log the user in — it only unlocks the password change form.
- The code expires 72 hours after generation.
- The code is invalidated only after a **successful** password change, not when the user first submits it. This means a user can enter the code, close the tab by accident, and resume later using the same code.
- Each user can have at most one active code. Generating a new one replaces the old one immediately.

**Routes involved:**

| Route              | Description                                                                 |
| ------------------ | --------------------------------------------------------------------------- |
| `/forgot-password` | Username + code form                                                        |
| `/reset-password`  | New password form (requires valid code from previous step via router state) |

## Walk-in Guests

Staff can add guests who have a Mazmo profile but didn't RSVP to the event. On the meetup detail page, click **"Add walk-in"** → search by name or @username → click Add. The guest appears in the list with a "Walk-in" badge. Walk-in events are recorded in the audit log.

The guest must already exist in the system (i.e. they've RSVPed to a previous event and been synced before). Truly anonymous guests (no Mazmo profile) are not supported.

---

## Deployment

Cloudflare Pages. Build command: `npm run build`. Output: `dist/`. No special config needed.
