# Handoff: Cypress + modularization of velvet

Read this first, then the per-area handoffs in this folder (`meetups.md`,
`guests.md`, `stats.md`, `admin.md`, `auth-app.md`).

## Goal (from the user)

1. Better modularization of components and of the file/code structure, so an
   AI (or a person) works comfortably in this codebase.
2. Automate every component and every user flow with Cypress, following the
   Cypress docs' best practices (mandatory).
3. Code coverage. Dependencies may be upgraded.
4. Everything in ONE PR from branch `claude/eloquent-knuth-k9w4kj`. A final
   report as a separate document (not only the PR body).
5. Backend changes allowed via a PR on `club-vanta/alter-tracker-backend`.
6. Stats: reduced scope (lean E2E, no RTL->Cypress migration; leave it for a
   follow-up PR).

User decisions already taken (do not ask again): stubbed E2E with
`cy.intercept` for most flows plus a small smoke suite against a real backend;
Cypress component tests (CT) for components; Vitest only for pure logic;
remove Playwright; `data-cy` selectors (plus built-in `cy.getByRole`);
`cypress-axe` a11y checks; role matrix (staff / orgAdmin / siteAdmin); door
flows also at 375px; English specs plus one Spanish walkthrough; CI job for
Cypress; English conventional commits; code review with `/code-review` at
`medium` level before the PR; never force-push.

## Done and pushed on `claude/eloquent-knuth-k9w4kj`

- Dependencies upgraded (TS stays 5.9, ESLint 9, Babel 7: see commit
  `4593acd` for why). Playwright removed.
- New layering `app -> features -> components -> domain -> hooks/lib/api`, each
  feature/domain with an `index.ts`; ESLint enforces it. i18n split into
  `src/lib/i18n/messages/<area>.ts`. See `CLAUDE.md` "Code map".
- Cypress 16 infra: `cypress.config.ts`, `cypress/support/**` (typed
  `cy.stubApi`, `cy.loginAs`, `cy.getBySel`, `cy.checkA11yAA`, `cy.mount` with
  providers, guard that fails unstubbed requests), factories in
  `src/tests/factories`, coverage (`npm run coverage`), CI job,
  `eslint-plugin-cypress`. Conventions: `cypress/README.md`.
- Login E2E + `PasswordInput` CT (fixed an a11y bug).
- Smoke suite infra + `cypress/e2e/smoke/login.cy.ts` (passes against a real
  backend).
- Docs: `CLAUDE.md`, `README.md`, `cypress/README.md`.

Backend (`alter-tracker-backend`, branch `claude/eloquent-knuth-k9w4kj`,
commit `e3cdbf8`, pushed, NO PR yet): `scripts/seed_e2e.py` + tests
(resets an isolated "E2E Club" org for the smoke suite).

## Work done by the per-area agents

Five agents worked in git worktrees (local branches
`worktree-agent-<id>`). Their work is merged into `claude/eloquent-knuth-k9w4kj`
(see the merge commits) together with their handoff files. Some of it is WIP:
each area handoff says what is green and what is not.

## State of the merged branch (not yet verified as a whole)

All five area branches are merged. Typecheck passes on the merged tree. Not
run yet on it: lint, Vitest, build, CT, E2E. Reported by the agents:

- Vitest: 3 failures in `src/components/ReasonDialog.test.tsx` (also a timeout
  under load) and 1 in GuestsPage tests.
- Meetups: the last batch of Vitest tests is committed as wip and never ran;
  the old meetups RTL tests are not deleted yet (see `meetups.md`).
- Admin: flaky E2E "generates a code for the account and copies it"
  (`staff-recovery-code.cy.ts`, 1 of 3 runs).
- Auth/app: E2E `app/routes.cy.ts` "Routes for orgAdmin > opens every page of
  the nav" timed out on the "Statistics" heading under load (stats is
  lazy-loaded: check the timeout or wait on the stats requests).
- Guests: final verification never ran (see `guests.md`).
- Several CT runs were not repeated after the last review-fix commits.

## What remains, in order

1. **Get the merged branch green.** Run, and fix what fails (start with the
   areas whose handoff says WIP):
   ```bash
   npm ci
   npm run check
   npm run test:run
   npm run build
   npm run test:ct
   npm run test:e2e
   ```
   Use `--config retries=0` locally so flakes show. In this cloud container
   Cypress needs `--browser /opt/pw-browsers/chromium`.
2. **Finish each area** following its handoff file (remaining component tests,
   RTL->CT migrations with an it()-title mapping, missing flows).
3. **Smoke specs** (`cypress/e2e/smoke/`): add `door.cy.ts` (staff checks in
   "E2E Luna" on "E2E Door" and marks her paid; reload shows it persisted) and
   `closing.cy.ts` (owner finalizes "E2E Closing"; reload shows read-only
   state). Use `seedBackend()` / `loginAsSeeded()` from
   `cypress/support/smoke.ts` and the `data-cy` names the meetups area added.
   How to run the backend locally without Docker: see "Local backend" below.
4. **Lint rule for file size:** add `max-lines` (~300, skip blank lines and
   comments) for `src/**/*.tsx` excluding tests and `src/api/types.ts`; split
   whatever still exceeds it.
5. **Run the full coverage** (`npm run coverage`) and note the numbers.
6. **Review:** `/code-review medium` over `git diff 283b772...HEAD`; fix real
   findings.
7. **Open the PRs:** one velvet PR from `claude/eloquent-knuth-k9w4kj` to
   `main` (check for a PR template), one backend PR from the same branch name.
   Link them to each other.
8. **Final report** as a separate document (user asked for it): what changed,
   new structure, how to test, coverage numbers, bugs found (fixed / not
   fixed, from the area handoffs), decisions, what is left for follow-ups
   (stats RTL->CT migration, `npm audit` dev-only issues: deepmerge,
   minimatch).

## Known issues to mention in the report

- Hardcoded strings found: Shell "Hide sidebar" (English), network error in
  `src/api/client.ts` (Spanish). The auth-app area fixed both; verify.
- `eslint-plugin-react-hooks` needs an `overrides` entry for
  `zod`/`zod-validation-error` (upstream bug); `cypress-axe` needs an override
  to accept Cypress 16. Both in `package.json`.

## Local backend (for the smoke suite), without Docker

```bash
# Postgres 16 is installed; initdb as the postgres user
D=/var/lib/postgresql/velvet-smoke
mkdir -p $D && chown postgres:postgres $D
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D -A trust -U postgres"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D -o '-p 5433 -k /tmp' -l $D/log.txt start"
psql -h /tmp -p 5433 -U postgres -c "create database alter_event_tracker;"

cd ../alter-tracker-backend   # git checkout claude/eloquent-knuth-k9w4kj
export DATABASE_URL=postgresql+psycopg://postgres@localhost:5433/alter_event_tracker
export JWT_SIGNING_KEY=local-dev-insecure-key-do-not-use-in-production
export E2E_PASSWORD=e2e-insecure-password-123
uv sync && uv run alembic upgrade head
nohup uv run uvicorn app.main:app --port 8000 &

cd ../velvet   # same shell, so the env vars reach the db:seed task
npm run test:smoke
```

## Gotchas

- Never `git add -A` at the repo root while agent worktrees exist under
  `.claude/worktrees/` (now gitignored, but check `git status`).
- Force-push is blocked in this environment: fix mistakes with new commits.
- `pkill -f "vite ..."` can kill your own shell; use `pkill -f "[v]ite ..."`.
- E2E specs import factories relatively (`../../../src/tests/factories`); CT
  specs use `@/tests/factories`.
