# Cypress and modularization: final report

This report covers the work on branch `claude/eloquent-knuth-k9w4kj`: a new
code structure for velvet, Cypress tests for every component and user flow,
code coverage, and the bugs that the new tests found. The companion backend
change is in `alter-tracker-backend` on the branch with the same name.

## Goals

1. Modularize components and files so that a person or an AI agent can find
   and change code without reading whole pages.
2. Test every component and every user flow with Cypress, following the
   [Cypress best practices](https://docs.cypress.io/app/core-concepts/best-practices).
3. Measure code coverage. Dependencies could be upgraded.
4. Deliver it in one velvet PR, plus a backend PR for what the tests need.

## Decisions

- **Stubbed E2E plus a small smoke suite.** Most flows run against
  `cy.intercept` stubs, so they are fast and deterministic. Three smoke specs
  run against a real local backend: login, the door (fee and check-in), and
  closing a meetup.
- **One tool per job.** Cypress component tests for components, Cypress E2E
  for user flows, Vitest only for pure logic and hooks. Playwright is
  removed.
- **Selectors.** `data-cy` attributes, or the built-in `cy.getByRole` when an
  element has a stable role and name. ESLint (`eslint-plugin-cypress`)
  enforces data selectors, no `force`, no `pause` or `debug`.
- **Accessibility.** `cypress-axe` checks WCAG 2.2 AA in the component and
  E2E specs (`cy.checkA11yAA`).
- **Roles and viewports.** Every flow runs for each role it allows (staff,
  organization admin, site admin) and checks the ones it refuses. Door flows
  also run at 375 px wide.
- **Language.** Specs run in English. One walkthrough runs in Spanish, and
  the components with translated copy have Spanish cases.
- **Time zone.** Cypress runs in UTC, as CI does, because the stats and
  weather fixtures are UTC.

## New code structure

```
src/
  app/                 composition root: route table, Shell layout
  features/<feature>/  auth, dashboard, meetups, guests, staff,
                       organizations, events, stats
    index.ts           the feature's public API
    <Name>Page.tsx     route components
    components/        one component per file
    api/               TanStack Query hooks, one per endpoint
    hooks/             UI state hooks
    lib/               pure logic, tested with Vitest
  domain/<entity>/     logic that several features share: session, guest, meetup
  components/          shared UI; ui/ is shadcn
  hooks/, lib/, api/   generic hooks, utilities, API client and query keys
  tests/factories/     typed API payload factories for Vitest and Cypress
cypress/               E2E specs and support code
```

ESLint enforces the rules that keep it that way:

- Layers import only to the right:
  `app → features → components → domain → hooks / lib / api`.
- Code crosses a feature or domain boundary only through its `index.ts`.
- A component file fails lint above 300 lines of code (`max-lines`), except
  tests and the generated `components/ui/` files.

The largest pages shrank by an order of magnitude, for example
`MeetupDetailPage.tsx` from 1,674 to 174 lines, `Shell.tsx` from 349 to 34,
`OrganizationDetailPage.tsx` from 509 to 43, and the largest stats file from
482 to 224. Translations moved from one file to
`src/lib/i18n/messages/<area>.ts`, with Spanish typed against English so a
missing translation fails the typecheck. Query keys and their invalidation
helpers live in `src/api/queryKeys.ts`.

`CLAUDE.md` has the code map and the rules, and `cypress/README.md` has the
testing conventions.

## Tests

| Suite                    | Files | Tests | Command              |
| ------------------------ | ----- | ----- | -------------------- |
| Cypress E2E (stubbed)    | 63    | 573   | `npm run test:e2e`   |
| Cypress component tests  | 116   | 719   | `npm run test:ct`    |
| Cypress smoke (real API) | 3     | 4     | `npm run test:smoke` |
| Vitest (logic and hooks) | 54    | 409   | `npm run test:run`   |

CI runs typecheck, lint, format, build and Vitest in one job, the Cypress
E2E and component suites with coverage in another, and the smoke suite
against a real backend and Postgres in a third.

Every deleted React Testing Library test has a counterpart in the new suites.
[rtl-migration-map.md](rtl-migration-map.md) lists them by file: 168 titles
were kept word for word and 265 were rewritten.

### How to run them

```bash
npm ci
npm run check       # typecheck, Prettier, ESLint
npm run test:run    # Vitest
npm run test:ct     # Cypress component tests
npm run test:e2e    # Cypress E2E, starts the dev server in e2e mode
npm run build
npm run coverage    # all suites with coverage, merged into coverage/all
```

The smoke suite needs a local backend; `cypress/README.md`, "Smoke suite",
explains how to start it and seed it. CI starts one for it.

## Coverage

Measured on the final commit with `npm run coverage` (Chromium, UTC):

| Suite                         | Statements | Branches | Functions | Lines |
| ----------------------------- | ---------- | -------- | --------- | ----- |
| Cypress (E2E and component)   | 97.3%      | 89.2%    | 97.3%     | 98.3% |
| Vitest (logic and hooks only) | 9.0%       | 6.3%     | 22.8%     | 12.8% |
| Combined (`coverage/all`)     | 88.2%      | 85.0%    | 95.1%     | 84.5% |

The Vitest figure is low by design: Vitest now covers only pure logic and
hooks, and Cypress covers components and pages.

The combined figure is lower than Cypress alone, which a union of the two
should not be. Vitest and the Vite plugin instrument the same files with
different statement maps, and `scripts/merge-coverage.mjs` merges them by
file, so the combined report is not reliable yet. Use the Cypress figure
until the merge is fixed (see Follow-ups).

## Bugs found and fixed

Each fix has a test that fails without it.

**Data and state**

- Loading errors no longer read as empty lists or zeros: guest lists, the
  meetup guest list ("No guests yet, sync"), the walk-in picker ("everyone is
  listed"), staff, dashboard, events, organizations, members and user search.
- The guests directory "Vanted" filter waits for the organization's vant
  list, and says when it failed, instead of matching nobody.
- A rejected staff role change reverts in the UI, and its error no longer
  says it succeeded.
- "Load more" in the audit log appends and drops duplicates.
- Turning a meetup's fee on or off refreshes the meetup and organization
  stats.
- The payment dialog keeps the action picked when it opened, even if a
  background refetch changes the meetup meanwhile.
- The login token is dropped when `/auth/userinfo` fails right after login.
- An unknown stored language no longer crashes the app.

**Routing**

- The guest and organization pages are keyed by their route parameter, so a
  dialog or search left open for one guest or organization closes when the
  route moves to another.

**Text, i18n and accessibility**

- Network errors show in the UI language instead of a raw "Failed to fetch"
  or a fixed language.
- Hardcoded English and Spanish strings moved to i18n (sidebar toggle,
  network error, app name, menus, badges).
- The 15-character password minimum shows a translated message, counts
  emoji as one character like the backend, and is checked for a preset value
  and after a language switch.
- A disabled "Unlink Mazmo account" is explained through `aria-describedby`
  and waits for the vant status.
- AA contrast fixed for the meetup relative date, group counts and add-member
  search. The Shell logout button has an accessible name on phones.
- The vant reason is trimmed before it is sent.
- Clipboard refusal or absence no longer claims "Copied!".

**Consistency and performance**

- The meetups list sorts names with the shared Spanish collation, so Ñ files
  after N.
- The meetup page uses one guest-type mutation instead of one per row (1,000+
  rows at large meetups).
- The Shell badge and the staff page share one pending-staff query, and the
  org switcher and organizations page share one organizations query, each
  with translated errors.

**Backend time zones** (backend PR)

- The app now opens every Postgres connection in UTC. Before, a server
  whose `TimeZone` was not UTC (any developer machine in Argentina) shifted
  meetup times by three hours, and five weather tests failed there.
- The models declare `timestamptz` like the migrations, so the test
  database has the production schema. Four tests that expected dates
  without a zone now expect the `Z` that production returns.
- The backend CI runs its tests and its Postgres in
  `America/Argentina/Buenos_Aires`, so a test that only passes in UTC fails
  there.

**Test infrastructure**

- The real-backend login stored its token after the app's own unauthenticated
  request could clear it; it now stores the token before the page loads.
- Flaky specs fixed: a debounced search pressed Down before results arrived,
  a frozen clock in the recovery-code copy test, a missing dashboard stub,
  and the lazy stats page on a cold dev server.
- The meetup location moved focus in an animation frame that could run
  before the target control rendered, so focus was lost on slow runs. It
  now moves after the render.

## Known issues, not fixed

- The shared `Button` `destructive` variant measures 4.24:1 in the dark
  theme. It needs a design decision on the color.
- Cancelled RSVP rows use `opacity-50`, so their text is 2.65:1. This is
  deliberate and commented in the code: they also carry a "Cancelled" label,
  so the state does not depend on contrast alone.
- Empty temperature bands in the stats weather chart show no tooltip,
  because Recharts skips null bars.
- The staff table disables the matching buttons on every row while one
  approval, role change or enable runs. This is deliberate and tested: one
  mutation tracks only its latest request, so per-row state would re-enable
  a row whose request is still running.
- `npm audit` reports dev-only issues in `deepmerge` and `minimatch`, pulled
  in by test tooling.
- `eslint-plugin-react-hooks` needs an `overrides` entry for `zod` and
  `zod-validation-error`, and `cypress-axe` one to accept Cypress 16. Both are
  in `package.json` and can go when upstream catches up.
- The Electron browser bundled with Cypress hangs on screenshots in some
  Linux setups. Run locally with Chrome or Chromium, as CI does.

## Follow-ups

- Decide the color of the destructive Button in the dark theme.
- Drop the `package.json` overrides once `eslint-plugin-react-hooks` and
  `cypress-axe` support the current versions.
- Fix the coverage merge so both suites use the same instrumentation, for
  example by running Vitest with the same Istanbul settings as the Vite
  plugin, or by reporting the suites separately.
