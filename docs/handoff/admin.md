# Handoff: dashboard, staff, organizations, events

Branch `worktree-agent-af3e81c0c73813f7b`, base `cd90782`.

## Done

- Refactor: StaffPage 476 -> 76 lines, OrganizationDetailPage 509 -> 43,
  DashboardPage 362 -> 93, EventsPage 288 -> 81, OrganizationsPage 197 -> 78.
  Code split into components/, api/, hooks/ and lib/ (with Vitest tests).
  Query keys moved to helpers in src/api/queryKeys.ts.
- Factories in src/tests/factories/admin.ts. Stub sets in
  cypress/support/routes/{dashboard,staff,organizations,events}.ts.
- E2E: 16 specs, 105 tests in cypress/e2e/{dashboard,staff,organizations,events}.
- CT: 17 *.cy.tsx files next to the components.
- RTL removed: staff/RecoveryCodeDialog.test.tsx (now covered by
  staff-recovery-code.cy.ts) and events/EventsPage.test.tsx (now covered by
  audit-log.cy.ts and lib/eventTypes.test.ts).
- Bug fixes, each with a test: rejected staff role reverts; load errors no
  longer shown as empty or zero (staff, dashboard, events, orgs, members,
  member orgs, user search); "Load more" appends and dedupes; named back
  button; per-row "Removing..."; role error fallback no longer says success;
  add-member search labelled, contrast fixed, debounced; org page keyed by
  :orgId; clipboard refusal or absence handled.

## Known failing or unverified

- FLAKY: staff-recovery-code.cy.ts "generates a code for the account and
  copies it" failed 1 of 3 runs with retries=0 (cy.clock/cy.tick around the
  2 s "Copied!" reset). Last commit is wip. Likely fix: install cy.clock()
  before the dialog opens, or drop the tick step and only assert "Copied!".
- Not re-run after the wip change: full E2E/CT (before it: E2E 104/105,
  same test). check, test:run, build green on 87585ac.

## For other owners (not changed here)

- Shell queries ["staff","pending"] with a queryFn that swallows errors; it
  shares the cache entry with usePendingStaff (exported by
  @/features/staff). Shell should use that hook or pendingStaffKey.
- OrgContext uses an inline ["organizations"] key with a non-throwing queryFn;
  switch it to organizationsKey and throw on error.
- MeetupRow "(7 days ago)" uses text-muted-foreground/70: fails axe contrast.
- Shell's phone header has an icon button with no accessible name.

## How to verify

npm run check && npm run test:run && npm run build
npx vite --mode e2e --port 5304 --strictPort (in the background)
npx cypress run --e2e --browser /opt/pw-browsers/chromium --config baseUrl=http://localhost:5304,retries=0 --spec "cypress/e2e/{dashboard,staff,organizations,events}/**"
npx cypress run --component --browser /opt/pw-browsers/chromium --config retries=0 --spec "src/features/{dashboard,staff,organizations,events}/**/*.cy.tsx"
