# Guest meetup attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show, on a guest's profile, every meetup of the active org the guest signed up for or walked into, with a per-meetup attendance status and a totals line.

**Architecture:** The backend owns the status rule (a pure function in `app/services/attendance.py`) and serves it from a new org-scoped endpoint in the organizations router. Velvet renders it as a new `GuestMeetups` timeline section in `GuestProfile.tsx`, styled like `NameHistory`.

**Tech Stack:** FastAPI, SQLModel, pytest (backend); React 19, TanStack Query, openapi-fetch, Vitest, Testing Library (velvet).

**Spec:** `docs/superpowers/specs/2026-10-23-guest-meetup-attendance-design.md`

## Global Constraints

- Status order: arrived+walk-in `WALKIN`, arrived `ATTENDED`, cancelled `CANCELLED`, finalized `NO_SHOW`, else `UPCOMING`.
- `summary.attended` includes walk-ins; `summary.walkin` is a subset of it.
- Spanish labels: Fue, Discreto (reuse `walkinLabel`), Se bajó, No fue, Próximo.
- Only meetups of `org_id`; newest `meetup.date` first; not paginated.
- No em dashes anywhere (code, comments, commits, PR text).
- Backend PR merges to `main` before velvet runs `npm run generate:api`.

## Review Focus

- RSVPs of the same guest in another org must never appear (backend test `test_other_org_rsvps_excluded`).
- A cancelled RSVP that still checked in is `ATTENDED` (unit test `test_arrived_beats_cancelled`).
- Reopening a finalized meetup turns its no-shows back into `UPCOMING` (unit test `test_not_finalized_is_upcoming`).
- A guest with no RSVPs in the org gets an empty list and the profile shows the empty state, not an error (backend `test_guest_without_rsvps_returns_empty`, velvet `shows empty state`).
- The meetups request failing must not break the rest of the profile (velvet `shows retry when meetups fail`).

---

## Part 1: Backend (`alter-tracker-backend`, branch `feat/guest-meetup-attendance`)

### Task 1: Attendance status rule

**Files:**

- Modify: `app/models/models.py` (new `GuestAttendanceStatus` StrEnum next to `GuestType`)
- Create: `app/services/attendance.py`
- Test: `tests/test_guest_attendance.py`

**Interfaces:**

- Produces: `GuestAttendanceStatus` (`ATTENDED`, `WALKIN`, `NO_SHOW`, `CANCELLED`, `UPCOMING`); `attendance_status(rsvp: MeetupRsvp, meetup: Meetup) -> GuestAttendanceStatus`.

- [ ] Write unit tests building `MeetupRsvp`/`Meetup` in memory (no DB): `test_walkin_arrived_is_walkin`, `test_arrived_is_attended`, `test_arrived_beats_cancelled`, `test_cancelled_is_cancelled_even_if_finalized`, `test_finalized_not_arrived_is_no_show`, `test_not_finalized_is_upcoming`.
- [ ] Run `uv run pytest tests/test_guest_attendance.py`: fails on import.
- [ ] Implement the enum and the function in the Global Constraints order.
- [ ] Run the tests: pass. Commit.

### Task 2: `GET /organizations/{org_id}/guests/{guest_id}/meetups`

**Files:**

- Modify: `app/schemas/guests.py`, `app/schemas/__init__.py`
- Modify: `app/openapi_examples/organizations_examples.py` (`GET_GUEST_MEETUPS_IN_ORG_RESPONSES`)
- Modify: `app/routers/organizations.py` (header docstring line + route)
- Modify: `tests/conftest.py` (`make_rsvp` gains `cancelled_rsvp`, `is_walkin`, `rsvp_time`; `make_meetup` gains `is_finalized`, all defaulting to today's behavior)
- Modify: `openapi.json` (regenerated)
- Test: `tests/test_guest_attendance.py`

**Interfaces:**

- Consumes: Task 1.
- Produces: `GuestMeetupAttendancePublic {meetup_id, name, date, status, rsvp_time, arrival_time, guest_type}`, `GuestAttendanceSummary {attended, walkin, no_show, cancelled, upcoming}`, `GuestMeetupAttendanceListResponse {total, summary, meetups}`.

- [ ] Write API tests: `test_lists_meetups_newest_first_with_status`, `test_summary_counts`, `test_other_org_rsvps_excluded`, `test_guest_without_rsvps_returns_empty`, `test_unknown_guest_404`, `test_unknown_org_404`, `test_non_member_403`, `test_staff_member_allowed`.
- [ ] Run them: 404 on the route.
- [ ] Implement: one `select(MeetupRsvp, Meetup).join(...)` filtered by `guest_id` and `org_id`, ordered by `Meetup.date desc`; statuses from Task 1; summary counted from the statuses.
- [ ] Run full suite, `uv run ruff check .`, `uv run ruff format --check .`, mypy if configured; regenerate `openapi.json`. Commit.

### Task 3: Ship backend

- [ ] Review agent over the branch; address findings.
- [ ] Push, open PR, wait for CI, merge to `main`.

## Part 2: Frontend (`velvet`, branch `feat/guest-meetup-attendance`)

### Task 4: Types, query key, invalidation, strings

**Files:**

- Modify: `src/api/types.ts` (via `npm run generate:api`)
- Modify: `src/lib/queryKeys.ts`: `guestMeetupsKey(orgId, guestId) = ["guest-meetups", orgId, guestId]`; `invalidateMeetupGuests` also invalidates `["guest-meetups", orgId]`.
- Modify: `src/features/meetups/FinalizeMeetupDialog.tsx`: finalize/reopen also invalidates `["guest-meetups", orgId]`.
- Modify: `src/lib/i18n.tsx`: en + es keys for the section title, the four non-walk-in labels, the summary parts, the meta line pieces, empty, and error.

### Task 5: `GuestMeetups` section

**Files:**

- Create: `src/features/guests/GuestMeetups.tsx` (keeps `GuestProfile.tsx` from growing; shares the timeline look with `NameHistory`)
- Modify: `src/features/guests/GuestProfile.tsx` (render below `NameHistory`, pass `orgId`)
- Test: `src/features/guests/GuestMeetups.test.tsx`, update the `GuestProfile.test.tsx` mock

- [ ] Tests: `renders each meetup with its status label`, `summary hides zero counts and shows walk-ins in parentheses`, `links to the meetup page`, `shows guest type badge only when not NORMAL`, `walk-in meta says it did not sign up`, `shows empty state`, `shows retry when meetups fail`, `does not query without an org`.
- [ ] Implement; run `npm run test:run`, `typecheck`, `lint`, `format:check`, `build`.

### Task 6: Ship frontend

- [ ] Check it in the browser against the local backend (page and meetup side sheet, light and dark, phone width).
- [ ] Review agent over the branch; address findings.
- [ ] Push, open PR, wait for CI, merge to `main`.
