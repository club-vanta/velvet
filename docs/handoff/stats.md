# Stats handoff

Branch `worktree-agent-aac16cb2e70a0adf1`, base `cd90782`.

## Done (all committed, green with retries=0 when last run)

- Factories for every stats response: `src/tests/factories/stats.ts`.
- Refactor: every tab split to one component per file (largest file now
  224 lines, was 482). Shared pieces extracted (`withEventDays`,
  `eventNameLabel`, `ColumnHeader`, `ChartEmptyNote`, `StatsTabGate`,
  `StatsTabSkeleton`, `StatsEmptyState`, `DateField`). Pure logic moved to
  `lib/` with Vitest: `offeredEvents`, `customSeed`, `clampCustom`,
  `noShowRateRows`, `scatterPoints`, `formatMeasure`.
- data-cy hooks on all stats components (test-only `data-slot` and
  `data-testid` replaced). `WeatherDetails` keeps its `data-slot` too, for
  the meetups feature.
- RTL tab/page tests migrated to Cypress CT (215 CT tests, 18 specs) and
  deleted; every scenario is covered there or in E2E/Vitest. Kept in
  Vitest: `useStatsFilters.test.tsx`, new `api/useOrgStats.test.tsx`,
  all pure-logic tests.
- E2E (`cypress/e2e/stats/`, ~70 tests): access, filters, tabs (every tab:
  data, loading, empty, error+retry), view toggles in URL, comparisons,
  guest links, retention, weather (meteogram tooltip by pointer and
  keyboard, 375px scroll/zoom). Helpers in `cypress/support/routes/stats.ts`.
- Build: recharts stays in the `stats-*.js` chunk.

## Known failures (not stats)

- `npm run test:run`: `ReasonDialog.test.tsx` (3) and `GuestsPage.test.tsx`
  (1) time out under machine load; they belong to other areas.

## Not done / follow-up

- No `/code-review` agent run over the diff (budget).
- Final full E2E + CT rerun after the last commit was not repeated.
- Shell bug (not stats): the logout button has no accessible name at
  375px (text is `hidden sm:inline`); phone axe scans are scoped to
  `[data-cy="stats-page"]` because of it.
- Requested outside this area: run Cypress with `TZ=UTC` in the npm
  scripts; some expected clock/date texts assume a UTC browser.
- Empty temperature bands show no tooltip (Recharts skips null bars).

## Verify

```bash
npm run check && npm run test:run && npm run build
npx vite --mode e2e --port 5303 --strictPort &
npx cypress run --e2e --browser /opt/pw-browsers/chromium \
  --config baseUrl=http://localhost:5303,retries=0 --spec "cypress/e2e/stats/**"
npx cypress run --component --browser /opt/pw-browsers/chromium \
  --config retries=0 --spec "src/features/stats/**/*.cy.tsx,src/components/{StatCard,WeatherDetails}.cy.tsx"
```
