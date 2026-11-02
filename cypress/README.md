# Cypress in velvet

Two suites run on Cypress 16, and both follow the
[Cypress best practices](https://docs.cypress.io/app/core-concepts/best-practices):

| Suite         | Where                           | What it covers                                                   | Run                  |
| ------------- | ------------------------------- | ---------------------------------------------------------------- | -------------------- |
| E2E (stubbed) | `cypress/e2e/<feature>/*.cy.ts` | User flows through the real app, with every API call stubbed     | `npm run test:e2e`   |
| Component     | `src/**/<Component>.cy.tsx`     | One component in the app's providers: states, events, a11y       | `npm run test:ct`    |
| Smoke (real)  | `cypress/e2e/smoke/*.cy.ts`     | The critical paths against a real backend (login, door, closing) | `npm run test:smoke` |

Vitest stays in place for pure logic (`lib/`, `domain/`, hooks, formatters). See
"Which tool" below.

Interactive mode: run `npm run dev:e2e` in one terminal and `npm run cy:open` in
another.

## Layout

```
cypress.config.ts            E2E + component config, coverage tasks
cypress/
  e2e/<feature>/*.cy.ts      one spec per user flow, grouped by feature
  e2e/smoke/*.cy.ts          real-backend suite (excluded from test:e2e)
  support/
    e2e.ts                   E2E support: commands, coverage, unstubbed-request guard
    component.tsx            CT support: cy.mount() with the app's providers
    commands/
      selectors.ts           cy.getBySel / getBySelLike / findBySel
      api.ts                 cy.stubApi / stubApiError (typed from OpenAPI)
      session.ts             cy.loginAs(role) / loginWithPassword
      a11y.ts                cy.checkA11yAA()
    routes/<feature>.ts      reusable stub sets for a feature's pages
src/tests/factories/         typed payload factories, shared with Vitest
```

## Rules

These come from the Cypress docs. ESLint (`eslint-plugin-cypress`) enforces the
ones marked ✱.

1. **Select with `data-cy`** ✱. Add `data-cy="<area>-<thing>"` to the element
   (`meetup-guest-search`, `guest-row-<id>`) and query it with
   `cy.getBySel()`. Use `cy.getByRole(role, { name })` when the role and
   accessible name are part of what the test guards (buttons, headings,
   dialogs). Use `cy.contains()` only when the test should fail if the copy
   changes. Never select by CSS class, tag or DOM structure.
2. **Stub every request through `cy.stubApi()`.** The app runs against
   `http://api.e2e.test` (`.env.e2e`), a host that does not exist, and
   `support/e2e.ts` fails the test on any request no test stubbed. The path and
   the body are typed from `src/api/types.ts`: a wrong shape fails
   `npm run typecheck`.
3. **Build payloads with factories** from `src/tests/factories` (`makeMeetup`,
   `makeMeetupGuest`, `USERS.staff`...). Override only the fields the test is
   about. Add a factory when a schema has none, and never cast a partial
   object. E2E specs import factories relatively
   (`../../../src/tests/factories`) because the E2E bundler does not resolve
   the `@/` alias; component specs use `@/tests/factories`.
4. **Log in programmatically.** `cy.loginAs("staff" | "orgAdmin" | "siteAdmin")`
   caches the session with `cy.session()` and stubs the session requests. Only
   `e2e/auth/login.cy.ts` goes through the form. Call `cy.visit()` after
   `cy.loginAs()`.
5. **Wait on aliases, never on time** ✱. `cy.stubApi(...).as("checkIn")`, then
   `cy.wait("@checkIn")`. Assert the request body the app sent:
   `cy.wait("@checkIn").its("request.body").should("deep.equal", {...})`.
6. **Do not assign command results** ✱ (`const x = cy.get()`). Use aliases and
   `.then()`.
7. **Independent tests.** Each `it` sets up its own state in `beforeEach` or in
   the test body and passes when run alone (`it.only`). No `after`/`afterEach`
   cleanup.
8. **One behavior per test, several assertions per behavior.** Name the test
   after the behavior ("checks a guest in and moves them to Arrived"), chain
   the assertions, and do not split one flow into one-assertion tests.
9. **Retry-friendly assertions.** Keep actions at the end of a chain, put
   logic that must retry together into `.should(callback)`, and assert exact
   text with `should("have.text", ...)`, not substrings of glued text.
10. **No `{ force: true }`** ✱, `cy.pause()` or `cy.debug()` ✱ left behind. If
    an element is covered, the user cannot click it either.
11. **Accessibility.** Each page or dialog state gets one `cy.checkA11yAA()`
    (WCAG 2.1 AA via axe). Pair it with explicit checks: `cy.getByRole()` for
    names, `cy.press(Cypress.Keyboard.Keys.TAB)` for focus order.
12. **Phones first.** Flows that staff run at the door also run at 375px:
    `context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, ...)`.
13. **Languages.** Specs run in English (`cy.loginAs(role)`), and
    `e2e/i18n/spanish.cy.ts` walks the main screens in Spanish.

## Component tests

```tsx
import { GuestCard } from "./GuestCard";
import { makeMeetupGuest } from "@/tests/factories";

describe("<GuestCard />", () => {
  it("calls onCheckIn with the guest", () => {
    const row = makeMeetupGuest({ guest: { displayname: "Luna" } });
    cy.mount(<GuestCard row={row} onCheckIn={cy.spy().as("onCheckIn")} />, {
      as: "staff",
    });
    cy.getByRole("button", { name: "Check in Luna" }).click();
    cy.get("@onCheckIn").should("have.been.calledOnceWith", row.guest.id);
  });
});
```

`cy.mount(node, options)` wraps `node` in the app's providers (React Query with
a fresh client and no retries, router, language, auth and organization).
Options: `as` (sign in as a role), `lang`, `path` (initial URL) and `route` (a
pattern such as `/meetups/:id` when the component reads params). Components
that fetch data get their requests stubbed with `cy.stubApi()`, exactly as in
E2E.

## Which tool

- **Cypress component test:** a component's rendering, its states (loading,
  error, empty, disabled), events and accessibility.
- **Cypress E2E:** a user flow across pages and requests, roles and
  permissions, routing, and what the app sends to the API.
- **Vitest:** pure functions and hooks without UI (`lib/`, `domain/`,
  `*/lib/*.ts`, query-key helpers). They run in milliseconds and need no
  browser.

## Coverage

`npm run coverage` runs Vitest with coverage, then both Cypress suites against
an instrumented app (`VITE_COVERAGE=true`, `vite-plugin-istanbul` with
`@cypress/code-coverage`), and merges everything into `coverage/all/index.html`.
Per-suite reports are in `coverage/unit` and `coverage/cypress`.

## Smoke suite (real backend)

The smoke suite exercises the full client-server contract on the paths the
door depends on: logging in, checking a guest in and taking their payment, and
closing a meetup. It runs against a local
[alter-tracker-backend](https://github.com/club-vanta/alter-tracker-backend)
checkout (default `../alter-tracker-backend`, override with
`VELVET_BACKEND_DIR`):

1. Start the backend on `localhost:8000` with its database migrated (backend
   README, "Quick Start").
2. In the shell that runs Cypress, export the backend's `DATABASE_URL` and
   `JWT_SIGNING_KEY` (the backend's dev shell sets them) and an `E2E_PASSWORD`
   of 15+ characters.
3. Run:

   ```bash
   npm run test:smoke
   ```

Before each test the `db:seed` task runs the backend's `scripts/seed_e2e.py`,
which resets an isolated "E2E Club" organization (two accounts, two meetups,
two guests) and returns its IDs, so every test starts from the same state. The
script refuses to touch a database that is not on localhost. The password is
read with `cy.env()`, so it never reaches the browser bundle or the repo.
