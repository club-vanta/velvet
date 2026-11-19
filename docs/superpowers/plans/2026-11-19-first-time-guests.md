# First-time Guests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Door staff see which guests of a meetup have never attended an event of the org: a badge on each newcomer, a "first time" filter, and a "Nuevos" stat card that applies it.

**Architecture:** The backend adds `prior_visits: int` to `MeetupGuestPublic`, counted from the same `attendances_cte` the stats use, in one query per request. Velvet derives "first time" from it in one pure function and uses that for the badge, the filter and the counter, all from the guest list it already loads.

**Tech Stack:** Backend: FastAPI, SQLModel, Postgres, pytest, basedpyright, ruff (devenv). Frontend: React, TanStack Query, openapi-fetch, Vitest, Cypress.

**Spec:** `docs/superpowers/specs/2026-11-19-first-time-guests-design.md` (velvet repo)

## Global Constraints

- "First time" at meetup M = no attendance (ATTENDED or WALKIN) of an audience guest type (NORMAL, INVITED) at a finalized meetup of the same org whose `date` is strictly before M's. Exactly the stats `FIRST_TIME` rule; reuse `attendances_cte`, never rewrite the rule.
- A guest only shows as new when their own RSVP at M is an audience type (NORMAL or INVITED). STAFF and VENDOR never get the badge.
- No per-guest query on the list endpoint; no new request in velvet.
- Two PRs: backend (`alter-tracker-backend`) first, merged and deployed; then velvet, whose `npm run generate:api` reads `openapi.json` from backend `main`.
- Every string in English and Spanish in `src/lib/i18n/messages/meetups.ts`. Copy: badge EN "First time" / ES "Primera vez"; filter EN "First time" / ES "Primera vez"; stat card title EN "New" / ES "Nuevos"; arrived line EN "{0} already arrived" / ES "{0} ya llegaron"; button EN "Show only new guests" / ES "Ver solo nuevos".
- No em dashes, no Latin abbreviations in code comments, commits or copy.
- Follow velvet `CLAUDE.md` (layers, `max-lines`, tests) and backend `CLAUDE.md` (`basedpyright`, `lint`, `run-tests` before done).

## Review Focus

1. A guest whose only earlier RSVP was a no-show or a cancellation must still be new (only arrivals count). Pinned in Task 1.
2. The current meetup itself, once finalized, must not count as a prior visit for its own guests (strictly earlier `date`). Pinned in Task 1.
3. After a check-in, walk-in add or guest-type change, the badge must not flicker or vanish: the single-guest responses carry the same `prior_visits`. Pinned in Task 2.
4. A guest who is new but now a STAFF or VENDOR at this meetup shows no badge and is not counted. Pinned in Task 3.
5. A cancelled newcomer: no badge in the counter, still matched by the filter (combinable with the RSVP filter). Pinned in Task 3.

---

## Part 1: alter-tracker-backend

Branch `feat/first-time-guests` from `main`. Commands run inside the devenv shell.

### Task 1: Count prior visits

**Files:**

- Create: `app/services/visits.py`
- Test: `tests/test_prior_visits.py`

**Interfaces:**

- Consumes: `attendances_cte(org_id: uuid.UUID) -> CTE` from `app/services/stats/retention.py`.
- Produces: `prior_visits_by_guest(session: Session, meetup: Meetup, guest_ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, int]`. Every id in `guest_ids` is a key; a guest with no prior attendance maps to `0`. Empty `guest_ids` returns `{}` without querying.

- [ ] **Step 1: Write the failing tests** with `make_org`, `make_meetup`, `make_guest`, `make_rsvp` from `tests/conftest.py`. Each test builds an org, a target meetup M (not finalized unless stated) and earlier meetups, then asserts the dict:
  - `test_guest_with_no_history_has_zero` -> `{g: 0}`
  - `test_only_rsvp_or_no_show_before_is_still_zero`: earlier finalized meetup, RSVP not arrived; second earlier, cancelled -> `{g: 0}`
  - `test_attended_earlier_finalized_meetups_counts_them`: arrived at two earlier finalized meetups, one as walk-in -> `{g: 2}`
  - `test_not_finalized_or_later_meetups_do_not_count`: arrived at an earlier non-finalized meetup and a later finalized one -> `{g: 0}`
  - `test_current_meetup_does_not_count_itself`: M finalized and g arrived at M -> `{g: 0}`
  - `test_other_org_meetups_do_not_count`: arrived at a finalized earlier meetup of another org -> `{g: 0}`
  - `test_staff_attendance_does_not_count`: arrived earlier as `guest_type=STAFF` -> `{g: 0}`
  - `test_empty_ids_returns_empty` -> `{}`

- [ ] **Step 2: Run them, expect FAIL** (`ModuleNotFoundError: app.services.visits`).
      Run: `pytest tests/test_prior_visits.py -v`

- [ ] **Step 3: Implement `prior_visits_by_guest`** in `app/services/visits.py`: select `att.c.guest_id, func.count()` from `attendances_cte(meetup.org_id)` where `guest_id.in_(guest_ids)` and `att.c.date < meetup.date`, grouped by guest; fill missing ids with `0`. Module docstring says it reuses the stats rule on purpose.

- [ ] **Step 4: Run them, expect PASS.** Then `basedpyright` and `lint`.

- [ ] **Step 5: Commit** `feat(meetups): count a guest's prior visits with the stats attendance rule`

### Task 2: `prior_visits` on every `MeetupGuestPublic`

**Files:**

- Modify: `app/schemas/guests.py` (`MeetupGuestPublic`)
- Modify: `app/routers/meetups.py` (list guests around line 412, add walk-in around line 634, set guest type around line 934)
- Modify: `app/openapi_examples/` entries that show a `MeetupGuestPublic`, if any
- Modify: `openapi.json` (regenerated)
- Test: `tests/test_meetups.py`, plus the walk-in and guest-type test modules (`tests/test_guest_type.py`, the walk-in tests wherever they live)

**Interfaces:**

- Consumes: `prior_visits_by_guest` (Task 1).
- Produces: `MeetupGuestPublic.prior_visits: int` (required, `ge=0`, with a `Field(description=...)` stating the rule in one sentence). It is the third top-level key next to `guest` and `rsvp`.

- [ ] **Step 1: Write the failing tests:**
  - `test_list_meetup_guests_includes_prior_visits`: one returning guest (arrived at an earlier finalized meetup) and one new guest -> `prior_visits` is `1` and `0`.
  - `test_list_meetup_guests_counts_prior_visits_in_one_query`: with 3 returning guests, the endpoint runs the same number of SQL statements as with 1 (count with a SQLAlchemy `before_cursor_execute` listener, or reuse an existing query counter fixture if the suite has one).
  - `test_add_walkin_returns_prior_visits` and `test_set_guest_type_returns_prior_visits`: a returning guest gets their real count, not `0`.

- [ ] **Step 2: Run them, expect FAIL** (`KeyError: 'prior_visits'`).

- [ ] **Step 3: Implement.** Add the field. Extract one private builder in `app/routers/meetups.py`, `_meetup_guest_public(rsvp: MeetupRsvp, guest: Guest, *, is_banned: bool, prior_visits: int) -> MeetupGuestPublic`, and use it at all three sites so the `GuestWithBanPublic` construction lives in one place. The list endpoint calls `prior_visits_by_guest` once with all guest ids; the two single-guest endpoints call it with one id.

- [ ] **Step 4: Run `run-tests`, `basedpyright`, `lint`, expect all PASS.** Regenerate the schema: `python scripts/generate_openapi.py`; `git diff openapi.json` shows only `prior_visits` added.

- [ ] **Step 5: Commit** `feat(meetups): return prior_visits with each meetup guest`

- [ ] **Step 6: Review and PR.** Run `/code-review` over the branch diff, fix real findings, open the PR. The user merges and deploys before Part 2's `generate:api`.

---

## Part 2: velvet

Branch `feat/first-time-guests` from `main`, after the backend PR is merged.

### Task 3: First-time rule, filter and badge

**Files:**

- Modify: `src/api/types.ts` (generated, `npm run generate:api`)
- Modify: `src/tests/factories/meetup.ts` (`makeMeetupGuest` default `prior_visits: 1`, so existing tests keep showing no badge)
- Create: `src/features/meetups/lib/firstTime.ts`, `src/features/meetups/lib/firstTime.test.ts`
- Modify: `src/features/meetups/lib/guestListView.ts`, `guestListView.test.ts`
- Modify: `src/features/meetups/components/GuestListToolbar.tsx`, `GuestListToolbar.cy.tsx`
- Modify: `src/features/meetups/components/GuestIdentity.tsx`, `GuestIdentity.cy.tsx`
- Modify: `src/lib/i18n/messages/meetups.ts`

**Interfaces:**

- Produces, in `firstTime.ts`:
  - `isFirstTime(mg: MeetupGuest): boolean`: `mg.prior_visits === 0` and `mg.rsvp.guest_type` is `NORMAL` or `INVITED`.
  - `countFirstTime(guests: readonly MeetupGuest[]): { total: number; arrived: number }`: over first-time guests whose RSVP is not cancelled; `arrived` counts `rsvp.has_arrived`.
- Produces: `GuestFilters.firstTimeOnly: boolean`, default `false`.

- [ ] **Step 1: Write the failing Vitest tests.**
  - `firstTime.test.ts`: `isFirstTime` is `true` for NORMAL and INVITED with `prior_visits: 0`; `false` with `prior_visits: 1`; `false` for STAFF and VENDOR with `prior_visits: 0`. `countFirstTime` on `[new pending, new arrived, new cancelled, new STAFF, returning]` returns `{ total: 2, arrived: 1 }`; on `[]` returns `{ total: 0, arrived: 0 }`.
  - `guestListView.test.ts`: `firstTimeOnly: true` keeps only first-time guests; with `rsvp: "cancelled"` too it keeps only the cancelled newcomer; `activeGuestFilters` lists `firstTimeOnly` when set.

- [ ] **Step 2: Run, expect FAIL.** `npm run test:run -- src/features/meetups/lib`

- [ ] **Step 3: Implement** `firstTime.ts`, the filter field and its line in `matches()`.

- [ ] **Step 4: Run, expect PASS.**

- [ ] **Step 5: Write the failing component tests.**
  - `GuestIdentity.cy.tsx`: a first-time guest shows `[data-cy="guest-first-time-badge"]` with text exactly `First time`; a returning guest and a first-time STAFF show none.
  - `GuestListToolbar.cy.tsx`: checking "First time" under "Show only" calls `onFilters` with `firstTimeOnly: true`; with it set, a chip labeled exactly `First time` is shown and removing it resets to `false`.

- [ ] **Step 6: Implement.** In `GuestIdentity`, an amber outline `Badge` (`border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300`, check 4.5:1 in both themes) with a small `Sparkles` icon (`aria-hidden`), first in the badge row. In the toolbar, a third `DropdownMenuCheckboxItem` under "Show only" and the `chipLabel` entry. Add the i18n keys (`firstTimeBadge`, `filterFirstTime`) in both languages.

- [ ] **Step 7: Run** `npm run test:ct -- --spec "src/features/meetups/components/{GuestIdentity,GuestListToolbar}.cy.tsx"`, **expect PASS**, then `npm run check`.

- [ ] **Step 8: Commit** `feat(meetups): mark and filter guests on their first visit`

### Task 4: "Nuevos" stat card

**Files:**

- Create: `src/features/meetups/components/FirstTimeStat.tsx`, `FirstTimeStat.cy.tsx`
- Modify: `src/features/meetups/components/MeetupStats.tsx` (render the card in its grid), `MeetupStats.cy.tsx`
- Modify: `src/features/meetups/MeetupDetailPage.tsx`
- Modify: `src/lib/i18n/messages/meetups.ts`
- Create: `cypress/e2e/meetups/first-time.cy.ts`

**Interfaces:**

- Consumes: `countFirstTime` and `GuestFilters.firstTimeOnly` (Task 3).
- Produces: `FirstTimeStat({ total, arrived, onShowOnly }: { total: number; arrived: number; onShowOnly: () => void })`, a `StatCard` titled "New" with the count (`data-cy="meetup-stats-first-time"`), the arrived line, and a ghost `Button` "Show only new guests". `MeetupStats` gets an optional `firstTime?: { total: number; arrived: number; onShowOnly: () => void }` prop and renders the card only when `firstTime.total > 0`, adjusting its grid column count.

- [ ] **Step 1: Write the failing tests.**
  - `FirstTimeStat.cy.tsx`: `total: 8, arrived: 3` shows `8` and exactly `3 already arrived`; clicking "Show only new guests" calls `onShowOnly` once.
  - `MeetupStats.cy.tsx`: with `firstTime.total: 0` the card is absent; with `total: 2` it is present. The existing loading and error cases stay green and show no first-time card.
  - `cypress/e2e/meetups/first-time.cy.ts` at a 375px viewport (`cy.loginAs`, `cy.stubApi` for every request, factories): a meetup with 2 newcomers and 3 returning guests; the "New" card shows `2`; tapping "Show only new guests" leaves exactly the 2 newcomers' cards, each with the badge, and the "First time" chip; removing the chip shows all 5.

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement.** `MeetupDetailPage` computes `countFirstTime(allGuests)` and passes `firstTime` with `onShowOnly: () => list.setFilters({ ...list.filters, firstTimeOnly: true })`. Add the i18n keys (`statsFirstTime`-style naming is taken by stats; use `meetupNewGuests`, `meetupNewArrived`, `meetupShowOnlyNew`).

- [ ] **Step 4: Run** the specs above, then the full gate: `npm run check`, `npm run test:run`, `npm run test:ct`, `npm run test:e2e`, `npm run build` (Cypress through the npm scripts with `VELVET_BROWSER`). **Expect all PASS.** Check `/meetups/:id` at 375px in a real browser with Playwright against the e2e dev server.

- [ ] **Step 5: Commit** `feat(meetups): show how many guests are new and filter to them`

- [ ] **Step 6: Review and PR.** `/code-review` over the branch, fix real findings, open the PR referencing the backend PR.
