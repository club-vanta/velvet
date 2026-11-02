# CLAUDE.md - velvet (Alter Tracker Frontend)

Staff portal for Club Vanta's Alter meetups. See `README.md` for the stack and setup, and `../alter-tracker-backend/CLAUDE.md` for the API side.

---

## RULE: senior-PR quality bar

Every change has to be set up correctly, done efficiently, and modularized, and it has to pass a PR review from a senior engineer. "It works" is not enough.

What that means in practice:

1. **Follow the existing patterns.** Read the surrounding code first and match its structure, naming, and idioms. Put code where the "Code map" below says, and API types are generated (`npm run generate:api`), never written by hand.
2. **Keep it modular.** Small components and hooks with one job each. No copy-paste: extract what is shared. No dead code, debug logs, or leftover TODOs.
3. **Keep it efficient.** No unnecessary renders, requests, or recomputations on large lists (the guest list has 1000+ entries). Measure before and after when performance is the point of the change.
4. **Test it.** New logic gets tests, and bug fixes get a test that fails without the fix.
5. **Verify before calling it done.** Everything CI runs has to pass locally:

   ```bash
   npm run check     # typecheck + prettier + eslint
   npm run test:run  # Vitest
   npm run test:ct   # Cypress component tests
   npm run test:e2e  # Cypress E2E (starts the dev server in e2e mode)
   npm run build
   ```

6. **Review non-trivial changes before the PR.** For anything beyond a small, mechanical change, run a review agent (for example `/code-review`) over the diff. It checks correctness, code quality, and architecture. Fix the real findings, push back on the wrong ones with a reason, and only then open the PR.

---

## Code map

```
src/
  main.tsx                 entry: React Query client, router, <App />
  app/                     composition root: route table (App.tsx), Shell layout
  features/<feature>/      one folder per area of the app (auth, dashboard, meetups,
                           guests, staff, organizations, events, stats)
    index.ts               the feature's public API: pages + what other features use
    <Name>Page.tsx         route components, at the feature root
    components/            the feature's components (one component per file)
    api/                   TanStack Query hooks for the feature's endpoints
    hooks/                 UI state hooks (filters, URL state)
    lib/                   pure logic, unit tested with Vitest
    tabs/<tab>/            stats only: one folder per tab
  domain/<entity>/         logic several features share, with an index.ts:
                           session (useAuth, useOrg), guest, meetup
  components/              shared UI used by several features; ui/ is shadcn
  hooks/                   generic React hooks with no domain knowledge
  lib/                     generic utilities; i18n/ holds the translations
  api/                     openapi-fetch client, generated types, query keys
  tests/factories/         typed API payload factories (Vitest and Cypress)
cypress/                   E2E specs, support commands; see cypress/README.md
```

Rules (ESLint enforces the first two with `no-restricted-imports`):

- **Layers only import to the right:** `app → features → components → domain → hooks / lib / api`. A feature never imports another feature's internals.
- **Cross a boundary through `index.ts`:** `import { GuestProfile } from "@/features/guests"`, never `@/features/guests/components/GuestProfile`. Inside a feature, use relative imports. `features/stats/index.ts` exports only the page, because App lazy-loads it to keep recharts out of the main bundle.
- **Where does new code go?** Used by one feature: inside it. Used by two or more features: `domain/<entity>/` if it is domain logic or data, `components/` if it is UI. Generic (no domain words): `lib/` or `hooks/`.
- **Keep files small.** A component file over ~300 lines has more than one job: split it into `components/`. Pages compose components and own the page's state; they do not render long inline JSX for dialogs, rows or sections.
- **Testing:** see `cypress/README.md`. Cypress component tests (`*.cy.tsx`, next to the component) for components, Cypress E2E (`cypress/e2e/<feature>/`) for user flows, Vitest (`*.test.ts`) for pure logic and hooks.

---

## Lessons from past reviews

Each item below was a real finding in an earlier PR. Check for them before asking for review.

### Data and cache

- **Invalidate everything a mutation touches.** Use the helpers in `src/api/queryKeys.ts` (`invalidateMeetupGuests`, `invalidateGuestIdentity`, `invalidateAllGuestIdentities`), never inline query keys. A Mazmo sync once left guest names stale in other meetups' cached lists because only one key was invalidated.
- **Loading and error are not "no".** When UI depends on a query (for example ban status), gate it on the query succeeding. Treating `undefined` as "not banned" showed wrong actions while loading and caused backend 409s.
- **Hide actions the backend refuses.** If the API rejects an action for a state (ban or unlink a banned guest, edits on a finalized meetup), the UI must not offer it, or must disable it with a reachable explanation.
- **Fix the contract at the source.** Types come from `npm run generate:api`. If a field is always present but typed optional, fix the backend schema instead of adding `!` or fallbacks here.

### Components and routing

- **Reuse shared components** from `src/components/` (`GuestBadges`, `GuestAvatar`, `FactStrip`, `ListToolbar`) instead of reimplementing them.
- **Param routes reuse the component instance.** Navigating `/meetups/a` to `/meetups/b` keeps local state (open sheets, search). Key the page by the route param or reset that state, and add a test for it.
- **Phones first.** Check layouts at 375px. Cypress specs for door flows also run at a 375px viewport. jsdom has no `matchMedia`, so in Vitest `useMediaQuery` needs a stub or the mobile branch is never tested.

### Text, i18n, and accessibility

- Every user-facing string goes in `src/lib/i18n/messages/<area>.ts` in both English and Spanish (`es` is typed against `en`, so a missing translation fails the typecheck). Keys are global: a key lives in exactly one module. Check that the Spanish copy means the same thing, not just that it exists.
- Split names into characters with `Array.from()`, not indexing, so emoji names do not break into lone surrogates.
- Search goes through `src/lib/searchText.ts` and sorting through `src/lib/sortNames.ts` (Spanish collation, so `Ñ` sorts after `N`). Do not write new normalization.
- Keep a correct heading hierarchy (h1, h2, h3), use `focus-visible` rings, and keep small text at 4.5:1 contrast or more.
- Do not explain a disabled control with `title` alone; keyboard and screen-reader users cannot reach it. Use `aria-describedby`. Do not put `aria-label` on elements that do not support it, such as a bare `<dl>`.

### Performance

- The React Compiler is on, so do not add `useMemo` or `useCallback` by default. Values that cross hook boundaries can still need a manual memo. Only keep one after measuring (4x CPU throttle on `/guests` with 1000+ guests) and add a comment saying why it is there.

### Tests

- Assert exact values, not substrings of glued `textContent`. Brittle matches broke on harmless markup changes.
- Mock every endpoint a new component calls, and cover the loading, error, and empty states, not just the happy path.
- Test fixtures must satisfy the full generated type. Do not cast partial objects. Use the factories in `src/tests/factories`.
- Cypress specs follow `cypress/README.md`: `data-cy` selectors or `cy.getByRole`, `cy.stubApi` for every request, `cy.loginAs` instead of the login form, aliases instead of `cy.wait(ms)`.
