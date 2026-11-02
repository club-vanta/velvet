# Meetups area: handoff

Branch `worktree-agent-a6e0d030f1b7ee423` (base cd90782). Owner scope: `src/features/meetups/**`,
`src/domain/meetup/**`, `ReasonDialog`, `useDebouncedValue`, `useMediaQuery`, meetups and guestTypes messages.

## Done

- Refactor: `MeetupDetailPage.tsx` 1674 -> 174 lines, `MeetupsPage.tsx` 344 -> 111. One component per file in
  `components/`, query/mutation hooks in `api/` (one per endpoint), UI state in `hooks/`
  (`useGuestListView`, `useMeetupDialogs`, `useProfileSheet`), pure rules in `lib/` (`guestRow`,
  `meetupListSort`, `mapUrl`). `invalidateMeetup` and `invalidateMeetups` added to `src/api/queryKeys.ts`.
  English-only fallback errors moved to i18n. `data-cy` hooks added.
- Fixes, each with a failing-first test: AA contrast of the relative date and group counts; the guest list
  saying "No guests yet, sync" when the load failed; the walk-in picker saying "everyone is listed" when
  the directory failed.
- E2E (`cypress/e2e/meetups/`, 12 specs, ~179 tests, all green with retries=0 when last run): list, create,
  detail, check-in, payments, guest-type, walk-in, finalize, sync, guest-list, location, weather. Every
  role, plus 375px for the door flows.
- Component tests: 38 `*.cy.tsx` files, all green with retries=0 when last run.
- Factories in `src/tests/factories/meetups.ts`. Stub sets and helpers in `cypress/support/routes/meetups.ts`.

## Remaining

1. Run and fix the last wip commit's Vitest files: `lib/guestRow.test.ts`, `lib/meetupListSort.test.ts`,
   `lib/mapUrl.test.ts`, `hooks/useMediaQuery.test.ts`, `api/meetupMutations.test.tsx`. Never executed;
   assertions on the invalidation order may need adjusting.
2. Add `toggleGuestSort` cases to `lib/guestListView.test.ts`.
3. Delete the migrated RTL tests: `MeetupDetailPage.test.tsx`, `MeetupsPage.test.tsx`,
   `components/{FinalizeMeetupDialog,GuestStatusLine,MeetupLocation,MeetupWeather}.test.tsx`,
   `src/components/ReasonDialog.test.tsx`. Every scenario has an E2E or CT counterpart (same titles,
   mostly). Keep `api/useGeocode.test.tsx` and `api/useSetMeetupLocation.test.tsx`: they are hook tests.
4. Write the it()-title -> new-test mapping for those deletions.
5. Optional E2E: the no-organization state (`loginAs` with `user.org_memberships: []`).
6. Full verification and a `/code-review` pass.

## Known issues (not fixed, outside my files or need design)

- Shared `Button` `destructive` variant: 4.24:1 in the dark theme (`src/components/ui/button.tsx`).
- Shell logout button has no accessible name below `sm` (`src/app/layout/Shell.tsx`).
- Cancelled RSVP rows use `opacity-50`, so their text is 2.65:1. Needs a design decision.
- Dashboard: `text-muted-foreground/70` contrast, same as the fix made here.
- Network errors toast the raw "Failed to fetch" (API client).
- Requests: ignore "ResizeObserver loop" in `cypress/support/e2e.ts` (the helper
  `ignoreResizeObserverLoop` covers it meanwhile), and add a `stubApi` variant for 422 and empty-body errors.

## Verify

```bash
npm run check && npm run test:run && npm run build
npx vite --mode e2e --port 5301 --strictPort &
npx cypress run --e2e --browser /opt/pw-browsers/chromium --config baseUrl=http://localhost:5301,retries=0 --spec "cypress/e2e/meetups/**"
npx cypress run --component --browser /opt/pw-browsers/chromium --config retries=0 --spec "src/{features/meetups,components}/**/*.cy.tsx"
```
