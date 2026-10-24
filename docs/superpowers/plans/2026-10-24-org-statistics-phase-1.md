# Organization Statistics, Phase 1 (Foundation + Asistencia) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/stats` page with its period and event selectors and the **Asistencia** tab, backed by a new org-admin stats endpoint.

**Architecture:** The backend gets a `stats` service package (period, audience, and finalized-meetup filters shared by every future tab), a SQL `CASE` twin of `attendance_status()`, and `GET /organizations/{org_id}/stats/attendance`. Velvet gets a `src/features/stats/` feature whose filter state lives in the URL, one hook per tab, and the shadcn `chart` component.

**Tech Stack:** FastAPI, SQLModel, SQLAlchemy `case`, PostgreSQL 18, pytest (real DB) / React 19, TanStack Query, react-router 7, openapi-fetch, shadcn (`base-nova`) + Recharts v3, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md` (velvet repo). Read it first. Phase 1 covers its "Access", "The page", "Which data counts", "Asistencia", and the Phase 1 line of "Delivery".

## Global Constraints

- Two PRs in order: backend (`alter-tracker-backend`, branch `feat/org-stats-attendance`) merges to `main` first, then velvet (branch `feat/org-statistics`, which already holds the spec commit). `npm run generate:api` reads the backend's `openapi.json` from GitHub `main`.
- Permission for every stats endpoint: `get_org_admin`. Velvet shows the nav entry and route only when `isSiteAdmin || activeOrg.role === "ADMIN"` (the existing `canSeeOrgs` / `canSeeAdminNav` checks).
- Only finalized meetups count (`Meetup.is_finalized`).
- Audience = guest types `NORMAL` and `INVITED`. `STAFF` and `VENDOR` RSVPs are excluded from Asistencia.
- Period filter on `Meetup.date` in `America/Argentina/Buenos_Aires`, start inclusive, end exclusive.
- Attendance status only through `app/services/attendance.py` (Python `attendance_status()` or its SQL twin). Never write the rule a third time.
- Cancellation rate = cancelled / signed_up. No-show rate = no_show / (signed_up - cancelled). signed_up counts non-walk-in RSVPs, cancelled or not. A rate with a zero denominator is `null`.
- Rates from fewer than 10 people (their denominator) are shown dimmed with `n` visible.
- Default period: last 3 months. Presets: last 30 days, last 3 months, last 12 months, this year, all time, custom.
- Comparison: aggregate = previous period of the same length; one event = period average; "all time" = no comparison.
- The word is **Asistencia** (es) / **Attendance** (en). Never "embudo" / "funnel".
- Backend: ASCII only in strings, comments, and docs; `# -- Section --` separators; `merge_error_responses`, never `**`, to combine OpenAPI responses; response fields that are always present have no default.
- Velvet: every string in `src/lib/i18n.tsx` in English and Spanish; no `useMemo`/`useCallback` without a measurement; works at 375px and on desktop.
- No em dashes anywhere (code, comments, commits, docs).
- Done means: backend `basedpyright`, `ruff check`, `ruff format --check`, `pytest` pass; velvet `npm run check`, `npm run test:run`, `npm run build` pass; a `/code-review` pass over each diff with real findings fixed before opening the PR.

## Review Focus

1. **A meetup whose only RSVPs are STAFF/VENDOR** -> audience counts are zero, rates and averages are `null` (no division error), and velvet shows a dash instead of `NaN%`. Tests in Task 3 and Task 9.
2. **An event late at night local time** (23:30 on Dec 31 in Buenos Aires is 02:30 UTC on Jan 1) -> it belongs to Dec 31 for period filters. Tests in Task 2 and Task 3.
3. **A URL with a bad `meetup` param** (unknown id, other org, or not finalized) -> backend 404, and velvet shows an error with a button back to "Todos los eventos" instead of a blank page. Tests in Task 4 and Task 9.
4. **A custom range with `from` after `to`** -> backend 422, and velvet never sends it (the inputs are constrained). Tests in Task 4 and Task 8.
5. **Stats left open while a meetup is unfinalized, or a check-in is undone on a finalized one** -> the stats queries refresh. Test in Task 6.

---

## Part A: Backend (`/home/krapp/dev/vanta/alter-tracker-backend`)

Start with `git switch -c feat/org-stats-attendance` from an up-to-date `main`.

### Task 1: SQL twin of the attendance rule

**Files:**
- Modify: `app/services/attendance.py`
- Test: `tests/test_guest_attendance.py`

**Interfaces:**
- Produces: `attendance_status_expr() -> ColumnElement[str | None]` in `app/services/attendance.py`. A SQLAlchemy `case(...)` over `MeetupRsvp.has_arrived`, `MeetupRsvp.is_walkin`, `MeetupRsvp.cancelled_rsvp`, and `Meetup.is_finalized`, returning the `GuestAttendanceStatus` values as strings, `NULL` for a walk-in never checked in. Callers must join `Meetup`.

- [ ] **Step 1: Write the failing parity test**

```python
@pytest.mark.parametrize("has_arrived", [False, True])
@pytest.mark.parametrize("is_walkin", [False, True])
@pytest.mark.parametrize("cancelled_rsvp", [False, True])
@pytest.mark.parametrize("is_finalized", [False, True])
def test_attendance_status_expr_matches_python_rule(
    session: Session, org: Organization, has_arrived: bool, is_walkin: bool, cancelled_rsvp: bool, is_finalized: bool
):
    """
    Verify the SQL CASE and attendance_status() agree on every flag combination.

    WHY: stats aggregate in SQL; the rule must not drift from the Python one.
    """
    meetup = make_meetup(session, org=org, is_finalized=is_finalized)
    rsvp = make_rsvp(session, meetup=meetup, guest=make_guest(session), has_arrived=has_arrived,
                     is_walkin=is_walkin, cancelled_rsvp=cancelled_rsvp)

    sql_value = session.exec(
        select(attendance_status_expr()).select_from(MeetupRsvp).join(Meetup, MeetupRsvp.meetup_id == Meetup.id)
        .where(MeetupRsvp.meetup_id == meetup.id)
    ).one()

    expected = attendance_status(rsvp, meetup)
    assert sql_value == (expected.value if expected else None)
```

- [ ] **Step 2: Run it and see it fail**

Run: `uv run pytest tests/test_guest_attendance.py -k expr -v`
Expected: FAIL with `ImportError: cannot import name 'attendance_status_expr'`.

- [ ] **Step 3: Implement `attendance_status_expr()`** next to `attendance_status()`, branches in the same order as its docstring. Update the module docstring to say both forms live here and the parity test keeps them equal.

- [ ] **Step 4: Run it and see 16 passes**

Run: `uv run pytest tests/test_guest_attendance.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/attendance.py tests/test_guest_attendance.py
git commit -m "feat: add a SQL form of the attendance rule with a parity test"
```

### Task 2: Stats period and scope helpers

**Files:**
- Create: `app/services/stats/__init__.py`, `app/services/stats/scope.py`
- Test: `tests/test_stats_scope.py`

**Interfaces:**
- Produces, in `app/services/stats/scope.py`:
  - `STATS_TZ = ZoneInfo("America/Argentina/Buenos_Aires")`
  - `AUDIENCE_GUEST_TYPES: tuple[str, ...] = (GuestType.NORMAL.value, GuestType.INVITED.value)`
  - `class InvalidStatsPeriodError(ValueError)`
  - `@dataclass(frozen=True) class StatsPeriod: start: date | None; end: date | None` with
    - `__post_init__`: raises `InvalidStatsPeriodError` when both are set and `start >= end`.
    - `utc_bounds() -> tuple[datetime | None, datetime | None]`: local midnight of each date in `STATS_TZ`, converted to UTC.
    - `previous() -> StatsPeriod | None`: `None` unless both bounds are set; otherwise the same length ending at `start`.
  - `finalized_meetups_in(org_id: uuid.UUID, period: StatsPeriod) -> Select`: `select(Meetup)` filtered by org, `is_finalized`, and the UTC bounds (`>= start`, `< end`).

- [ ] **Step 1: Write the failing tests**

- `test_stats_period_rejects_start_not_before_end`: `StatsPeriod(date(2026,5,1), date(2026,5,1))` raises `InvalidStatsPeriodError`.
- `test_stats_period_utc_bounds_use_buenos_aires_midnight`: `StatsPeriod(date(2026,1,1), date(2026,2,1)).utc_bounds() == (datetime(2026,1,1,3,tzinfo=UTC), datetime(2026,2,1,3,tzinfo=UTC))`.
- `test_stats_period_previous_has_same_length`: `StatsPeriod(date(2026,4,1), date(2026,4,11)).previous() == StatsPeriod(date(2026,3,22), date(2026,4,1))`.
- `test_stats_period_previous_is_none_without_both_bounds`: `StatsPeriod(None, date(2026,1,1)).previous() is None`.
- `test_finalized_meetups_in_uses_local_date_for_late_events` (DB): a finalized meetup at `datetime(2027,1,1,2,30,tzinfo=UTC)` (Dec 31 23:30 local) is returned for `StatsPeriod(date(2026,12,1), date(2027,1,1))` and not for `StatsPeriod(date(2027,1,1), date(2027,2,1))`.
- `test_finalized_meetups_in_skips_open_meetups_and_other_orgs` (DB): an unfinalized meetup and a finalized meetup of another org are not returned.

- [ ] **Step 2: Run them and see them fail**

Run: `uv run pytest tests/test_stats_scope.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.stats'`.

- [ ] **Step 3: Implement `app/services/stats/scope.py`** with the interfaces above. `__init__.py` holds only a module docstring saying the package has one module per stats tab plus the shared `scope` filters.

- [ ] **Step 4: Run them and see them pass**

Run: `uv run pytest tests/test_stats_scope.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/stats tests/test_stats_scope.py
git commit -m "feat: add the shared period and scope filters for org stats"
```

### Task 3: Attendance stats service

**Files:**
- Create: `app/services/stats/attendance.py`
- Test: `tests/test_stats_attendance.py` (service tests in this task; endpoint tests are added in Task 4)

**Interfaces:**
- Consumes: `attendance_status_expr()` (Task 1); `StatsPeriod`, `AUDIENCE_GUEST_TYPES`, `finalized_meetups_in` (Task 2).
- Produces, in `app/services/stats/attendance.py`:
  - `@dataclass(frozen=True) class MeetupAttendanceRow: meetup_id: uuid.UUID; name: str; date: datetime; signed_up: int; cancelled: int; attended: int; walkin: int; no_show: int`
  - `@dataclass(frozen=True) class AttendanceTotals: events: int; signed_up: int; cancelled: int; attended: int; walkin: int; no_show: int; cancellation_rate: float | None; no_show_rate: float | None; avg_signed_up_per_event: float | None; avg_attended_per_event: float | None`
  - `class StatsComparisonKind(StrEnum): PREVIOUS_PERIOD = "PREVIOUS_PERIOD"; PERIOD_AVERAGE = "PERIOD_AVERAGE"` (in `app/models/models.py`, next to the other domain enums, so the schema can use it)
  - `@dataclass(frozen=True) class AttendanceStats: meetups: list[MeetupAttendanceRow]; totals: AttendanceTotals; comparison_kind: StatsComparisonKind | None; comparison: AttendanceTotals | None`
  - `meetup_attendance_rows(session: Session, org_id: uuid.UUID, period: StatsPeriod) -> list[MeetupAttendanceRow]`: one SQL query grouping by meetup with `count(...).filter(...)` over `attendance_status_expr()`, audience only, date ascending. A finalized meetup with zero audience RSVPs still appears with zeros (outer join).
  - `summarize_rows(rows: list[MeetupAttendanceRow]) -> AttendanceTotals`: pure. Rates rounded to 4 decimals, averages to 1.
  - `attendance_stats(session: Session, org_id: uuid.UUID, period: StatsPeriod, meetup_id: uuid.UUID | None) -> AttendanceStats`:
    - `meetup_id is None`: rows of the period, totals of those rows, comparison = totals of `period.previous()` with kind `PREVIOUS_PERIOD`, or both `None` when `previous()` is `None`.
    - `meetup_id` set: rows = that meetup's row only (looked up by id, regardless of the period), totals of it, comparison = totals of the whole period with kind `PERIOD_AVERAGE`.
  - The caller guarantees `meetup_id` is a finalized meetup of the org (the router checks, Task 4).

Definitions per row (statuses from the SQL twin, audience only): `signed_up` = non-walk-in RSVPs with a status; `cancelled` = `CANCELLED`; `attended` = `ATTENDED` + `WALKIN`; `walkin` = `WALKIN`; `no_show` = `NO_SHOW`.

- [ ] **Step 1: Write the failing tests** (each builds one finalized meetup unless stated, with `rsvp_time` and dates fixed)

- `test_meetup_attendance_rows_counts_each_status`: 3 attended, 1 cancelled, 2 no-show, 1 walk-in checked in, 1 walk-in never checked in -> row `signed_up=6, cancelled=1, attended=4, walkin=1, no_show=2`.
- `test_meetup_attendance_rows_counts_cancelled_but_checked_in_as_attended`: one RSVP `cancelled_rsvp=True, has_arrived=True` -> `attended=1, cancelled=0`.
- `test_meetup_attendance_rows_excludes_staff_and_vendor`: one `STAFF` and one `VENDOR` attended, one `INVITED` attended -> `attended=1`.
- `test_meetup_attendance_rows_keeps_meetup_with_no_audience`: a meetup with only `STAFF` RSVPs -> one row, all zeros.
- `test_summarize_rows_rates_and_averages`: rows `(signed_up=10, cancelled=2, attended=7, walkin=1, no_show=2)` and `(signed_up=6, cancelled=0, attended=5, walkin=0, no_show=1)` -> `events=2, signed_up=16, cancelled=2, attended=12, walkin=1, no_show=3, cancellation_rate=0.125, no_show_rate=0.2143, avg_signed_up_per_event=8.0, avg_attended_per_event=6.0`.
- `test_summarize_rows_returns_none_rates_when_empty`: `summarize_rows([])` -> counts 0, every rate and average `None`.
- `test_attendance_stats_aggregate_compares_with_previous_period`: meetups on 2026-04-05 and 2026-03-25, period 2026-04-01..2026-04-11 -> `meetups` has only the April one, `comparison_kind == PREVIOUS_PERIOD`, `comparison.events == 1` (the March one).
- `test_attendance_stats_all_time_has_no_comparison`: `StatsPeriod(None, None)` -> `comparison is None and comparison_kind is None`.
- `test_attendance_stats_single_meetup_compares_with_period`: two meetups in the period, `meetup_id` = one of them -> `len(meetups) == 1`, `totals.events == 1`, `comparison_kind == PERIOD_AVERAGE`, `comparison.events == 2`.

- [ ] **Step 2: Run them and see them fail**

Run: `uv run pytest tests/test_stats_attendance.py -v`
Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement** the interfaces above in `app/services/stats/attendance.py`, and `StatsComparisonKind` in `app/models/models.py`.

- [ ] **Step 4: Run them and see them pass**

Run: `uv run pytest tests/test_stats_attendance.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/stats/attendance.py app/models/models.py tests/test_stats_attendance.py
git commit -m "feat: compute org attendance stats per meetup and per period"
```

### Task 4: Attendance stats endpoint

**Files:**
- Create: `app/schemas/stats.py`, `app/routers/stats.py`, `app/openapi_examples/stats_examples.py`
- Modify: `app/schemas/__init__.py` (re-export), `app/main.py` (`include_router(stats.router)`), `openapi.json` (regenerated)
- Test: `tests/test_stats_attendance.py`

**Interfaces:**
- Consumes: `attendance_stats`, `AttendanceStats`, `StatsPeriod`, `InvalidStatsPeriodError` (Tasks 2-3).
- Produces: `GET /organizations/{org_id}/stats/attendance` with query `from: date | None`, `to: date | None`, `meetup_id: uuid.UUID | None`, response `AttendanceStatsPublic`:
  - `MeetupAttendanceRowPublic`: `meetup_id: uuid.UUID, name: str, date: datetime, signed_up: int, cancelled: int, attended: int, walkin: int, no_show: int`
  - `AttendanceTotalsPublic`: same fields as `AttendanceTotals`, nullable floats with no default
  - `AttendanceStatsPublic`: `meetups: list[MeetupAttendanceRowPublic], totals: AttendanceTotalsPublic, comparison_kind: StatsComparisonKind | None, comparison: AttendanceTotalsPublic | None`
  - All with `model_config = ConfigDict(from_attributes=True)`.
- `from` and `to` are optional (leaving both out is "all time"). Use `Query(alias="from")` for `from`.

Router rules:
- Module docstring lists the route, like `meetups.py`.
- `_admin: User = Depends(get_org_admin)`.
- `InvalidStatsPeriodError` -> 422, detail `"Cannot compute stats: 'from' ({from}) must be before 'to' ({to}). Pick a later 'to' date."`
- `meetup_id` not found, in another org, or not finalized -> 404, detail `"Cannot compute stats: meetup {meetup_id} is not a finalized meetup of organization {org_id}. List the org's meetups to find a finalized one."`
- `responses=merge_error_responses(...)`: 200 example, `error_401_invalid_credentials()`, `error_403_admin_required()`, `error_404_meetup()`, `error_422_validation()`.

- [ ] **Step 1: Write the failing endpoint tests**

- `test_attendance_stats_returns_401_without_auth`
- `test_attendance_stats_returns_403_for_staff_member` (`staff_headers`)
- `test_attendance_stats_returns_403_for_admin_of_other_org`
- `test_attendance_stats_returns_200_with_exact_totals` (`admin_headers`; reuse the Task 3 "each status" setup and assert the JSON `totals` and the single `meetups` row field by field, including `"date"`)
- `test_attendance_stats_returns_200_for_site_admin`
- `test_attendance_stats_returns_422_when_from_not_before_to` (`from=2026-05-01&to=2026-05-01`)
- `test_attendance_stats_returns_404_for_unfinalized_meetup`
- `test_attendance_stats_returns_404_for_meetup_of_other_org`
- `test_attendance_stats_returns_empty_totals_for_empty_period` (`meetups == []`, `totals.no_show_rate is None`)

- [ ] **Step 2: Run them and see them fail**

Run: `uv run pytest tests/test_stats_attendance.py -k "returns_" -v`
Expected: FAIL with 404 (route does not exist).

- [ ] **Step 3: Implement** the schemas, the OpenAPI example (one realistic aggregate response), the router, and the `main.py` include.

- [ ] **Step 4: Run them and see them pass, then regenerate the contract**

Run: `uv run pytest tests/test_stats_attendance.py -v && uv run python scripts/generate_openapi.py`
Expected: all PASS; `openapi.json written to ...`; `git diff openapi.json` shows only the new path and schemas.

- [ ] **Step 5: Commit**

```bash
git add app/schemas app/routers/stats.py app/openapi_examples/stats_examples.py app/main.py openapi.json tests/test_stats_attendance.py
git commit -m "feat: add the org attendance stats endpoint"
```

### Task 5: Backend verification and PR

- [ ] **Step 1: Run the full gate**

Run: `uv run basedpyright && uv run ruff check && uv run ruff format --check && uv run pytest`
Expected: 0 errors, no lint findings, no files to reformat, all tests pass.

- [ ] **Step 2: Run `/code-review` over the branch diff.** Fix real findings (commit each fix with a test when it is a bug) and note rejected ones with the reason for the PR body.

- [ ] **Step 3: Push and open the PR** against `main`, titled `feat: org attendance stats endpoint`, linking the velvet spec. The user merges it; Part B starts after the merge.

---

## Part B: Velvet (`/home/krapp/dev/vanta/velvet`, branch `feat/org-statistics`)

### Task 6: Types, chart component, and query keys

**Files:**
- Modify: `src/api/types.ts` (generated), `package.json` / `package-lock.json` (recharts via shadcn), `src/lib/queryKeys.ts`, `src/features/meetups/FinalizeMeetupDialog.tsx`
- Create: `src/components/ui/chart.tsx` (shadcn CLI)
- Test: `src/lib/queryKeys.test.ts`

**Interfaces:**
- Produces, in `src/lib/queryKeys.ts`:
  - `statsOrgKey(orgId: string) => ["stats", orgId] as const`
  - `statsAttendanceKey(orgId: string, filters: StatsQuery) => [...statsOrgKey(orgId), "attendance", filters] as const`, where `type StatsQuery = { from?: string; to?: string; meetupId?: string }` is created now in `src/features/stats/statsPeriod.ts` (the file holds only this type until Task 7 fills it in).
  - `invalidateMeetupGuests` also invalidates `statsOrgKey(orgId)` (check-ins and undo on finalized meetups change stats). Update its doc comment.
- `FinalizeMeetupDialog` `onSuccess` also invalidates `statsOrgKey(orgId)`.

- [ ] **Step 1: Generate types and add the chart**

Run: `npm run generate:api && npx shadcn@latest add chart`
Expected: `src/api/types.ts` contains `AttendanceStatsPublic`; `src/components/ui/chart.tsx` exists; `recharts` is in `dependencies`.

- [ ] **Step 2: Write the failing test** in `src/lib/queryKeys.test.ts`: `invalidateMeetupGuests` calls `invalidateQueries` with `{ queryKey: ["stats", "org-1"] }` (spy on a real `QueryClient`, assert the exact call list).

- [ ] **Step 3: Run it and see it fail**

Run: `npx vitest run src/lib/queryKeys.test.ts`
Expected: FAIL, the stats key is not in the calls.

- [ ] **Step 4: Implement** the keys and both invalidations.

- [ ] **Step 5: Run it and see it pass, then commit**

Run: `npx vitest run src/lib/queryKeys.test.ts`
Expected: PASS.

```bash
git add src/api/types.ts package.json package-lock.json src/components/ui/chart.tsx src/lib/queryKeys.ts src/lib/queryKeys.test.ts src/features/meetups/FinalizeMeetupDialog.tsx src/features/stats/statsPeriod.ts
git commit -m "feat: add stats types, chart component, and stats query keys"
```

### Task 7: Period resolution and stat formatting

**Files:**
- Modify: `src/features/stats/statsPeriod.ts` (created in Task 6 with only `StatsQuery`)
- Create: `src/features/stats/statsFormat.ts`
- Test: `src/features/stats/statsPeriod.test.ts`, `src/features/stats/statsFormat.test.ts`

**Interfaces:**
- Produces, in `statsPeriod.ts`:
  - `type RangePreset = "30d" | "3m" | "12m" | "ytd" | "all" | "custom"`; `DEFAULT_RANGE: RangePreset = "3m"`
  - `type StatsQuery = { from?: string; to?: string; meetupId?: string }` (dates as `YYYY-MM-DD`)
  - `resolveRange(preset: RangePreset, today: string, custom?: { from: string; to: string }): Pick<StatsQuery, "from" | "to">`. `to` is always the day after `today` (exclusive end) except for `custom` (`to` = day after `custom.to`, so the picked end day is included) and `all` (both undefined).
  - `isRangePreset(value: string | null): value is RangePreset`
- Produces, in `statsFormat.ts`:
  - `SMALL_SAMPLE = 10`
  - `formatRate(rate: number | null, locale: string): string`: `null` -> `"–"`, otherwise a whole percent (`0.2143` -> `"21%"`).
  - `formatChange(current: number | null, baseline: number | null): number | null`: whole percent change, `null` when either is `null` or baseline is 0.
  - `isSmallSample(n: number): boolean` -> `n < SMALL_SAMPLE`.

- [ ] **Step 1: Write the failing tests** with fixed `today = "2026-10-24"`:
  - `"30d"` -> `{ from: "2026-09-24", to: "2026-10-25" }`; `"3m"` -> `{ from: "2026-07-24", to: "2026-10-25" }`; `"12m"` -> `{ from: "2025-10-24", to: "2026-10-25" }`; `"ytd"` -> `{ from: "2026-01-01", to: "2026-10-25" }`; `"all"` -> `{}`; `"custom"` with `{ from: "2026-03-01", to: "2026-03-31" }` -> `{ from: "2026-03-01", to: "2026-04-01" }`.
  - `"3m"` on `today = "2026-05-31"` -> `from: "2026-02-28"` (end-of-month clamp).
  - `formatRate(null, "es") === "–"`, `formatRate(0.2143, "es") === "21%"`; `formatChange(412, 381) === 8`, `formatChange(5, 0) === null`, `formatChange(null, 3) === null`; `isSmallSample(9) === true`, `isSmallSample(10) === false`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/features/stats`
Expected: FAIL, functions not exported.

- [ ] **Step 3: Implement** both modules. Date math on `YYYY-MM-DD` strings in UTC so the machine's zone never shifts a day.

- [ ] **Step 4: Run them and see them pass, then commit**

Run: `npx vitest run src/features/stats`
Expected: PASS.

```bash
git add src/features/stats/statsPeriod.ts src/features/stats/statsPeriod.test.ts src/features/stats/statsFormat.ts src/features/stats/statsFormat.test.ts
git commit -m "feat: add stats period presets and number formatting"
```

### Task 8: Stats page shell, filters in the URL, nav entry

**Files:**
- Create: `src/hooks/useOrgMeetups.ts`, `src/features/stats/useStatsFilters.ts`, `src/features/stats/StatsFilterBar.tsx`, `src/features/stats/StatsPage.tsx`
- Modify: `src/features/meetups/MeetupsPage.tsx` (use `useOrgMeetups` instead of its inline query), `src/App.tsx`, `src/layout/Shell.tsx`, `src/lib/i18n.tsx`
- Test: `src/features/stats/StatsPage.test.tsx`

**Interfaces:**
- Produces:
  - `useOrgMeetups(orgId: string)`: the existing `["meetups", orgId]` query moved out of `MeetupsPage` unchanged, returning the `useQuery` result.
  - `useStatsFilters(): { preset: RangePreset; custom?: { from: string; to: string }; meetupId?: string; tab: StatsTab; query: StatsQuery; setPreset(p: RangePreset): void; setCustom(r: { from: string; to: string }): void; setMeetupId(id?: string): void; setTab(t: StatsTab): void }` backed by `useSearchParams`. Params: `range`, `from`, `to` (custom only, inclusive end as picked), `meetup`, `tab`. Invalid or missing `range` falls back to `DEFAULT_RANGE`. `type StatsTab = "attendance"` for now.
  - `StatsPage`: `h1` "Estadísticas", `StatsFilterBar`, then `Tabs` with one tab (Asistencia) rendering `AttendanceTab` (Task 9; render a placeholder `div` until then).
  - `StatsFilterBar`: period `Select` with the six presets; when `custom`, two `<input type="date">` with `max`/`min` tied to each other so `from > to` cannot be picked; event `Select` with "Todos los eventos" plus finalized meetups whose local date falls inside the resolved range, newest first, labelled `name · dd/mm`. Wraps to two rows under `sm`.
  - Route `/stats` in `App.tsx` under `canSeeOrgs`. Nav item `{ label: t("navStats"), shortLabel: "Stats", href: "/stats", icon: ChartColumn, adminOnly: true }` placed after Guests.
  - i18n keys (en / es): `navStats` "Statistics" / "Estadísticas"; `statsTitle` same; `statsRangeLast30` "Last 30 days" / "Últimos 30 días"; `statsRangeLast3m` "Last 3 months" / "Últimos 3 meses"; `statsRangeLast12m` "Last 12 months" / "Últimos 12 meses"; `statsRangeYtd` "This year" / "Este año"; `statsRangeAll` "All time" / "Desde siempre"; `statsRangeCustom` "Custom range" / "Rango a medida"; `statsRangeFrom` "From" / "Desde"; `statsRangeTo` "To" / "Hasta"; `statsAllEvents` "All events" / "Todos los eventos"; `statsTabAttendance` "Attendance" / "Asistencia".

- [ ] **Step 1: Write the failing tests** (mock `@/api/client` and `@/lib/org` as in `MeetupsPage.test.tsx`; render inside `MemoryRouter` with a location probe)
  - `renders the default period "Últimos 3 meses" and "Todos los eventos"` at `/stats`.
  - `choosing "Este año" writes range=ytd to the URL`.
  - `the event list only offers finalized meetups inside the range`: meetups finalized-in-range, unfinalized-in-range, finalized-out-of-range -> only the first is an option.
  - `choosing an event writes meetup=<id> and choosing "Todos los eventos" removes it`.
  - `an invalid range param falls back to the default`: `/stats?range=bogus` shows "Últimos 3 meses".
  - In `src/layout/Shell` coverage (add to `StatsPage.test.tsx` or the existing Shell test if one exists): the "Estadísticas" nav link is absent for an org `STAFF` and present for an org `ADMIN`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/features/stats/StatsPage.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** the hook, filter bar, page, route, nav item, and strings; move the meetups query into `useOrgMeetups` and use it in `MeetupsPage`.

- [ ] **Step 4: Run the page tests and the meetups tests**

Run: `npx vitest run src/features/stats src/features/meetups`
Expected: all PASS (MeetupsPage unchanged in behavior).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useOrgMeetups.ts src/features/stats src/features/meetups/MeetupsPage.tsx src/App.tsx src/layout/Shell.tsx src/lib/i18n.tsx
git commit -m "feat: add the stats page with period and event filters in the URL"
```

### Task 9: Asistencia tab

**Files:**
- Create: `src/hooks/useAttendanceStats.ts`, `src/features/stats/HeadlineStat.tsx`, `src/features/stats/ChartCard.tsx`, `src/features/stats/AttendanceTab.tsx`
- Modify: `src/features/stats/StatsPage.tsx`, `src/lib/i18n.tsx`; if the card look is shared, extract `StatCard` from `src/features/meetups/MeetupStats.tsx` into `src/components/StatCard.tsx` and use it in both
- Test: `src/features/stats/AttendanceTab.test.tsx`

**Interfaces:**
- Consumes: `statsAttendanceKey`, `StatsQuery`, `formatRate`, `formatChange`, `isSmallSample`, `useStatsFilters`, `chart.tsx`.
- Produces:
  - `useAttendanceStats(orgId: string, query: StatsQuery)`: `GET /organizations/{org_id}/stats/attendance` with `from`, `to`, `meetup_id`; throws `t("failedLoadStats")` on error; no polling.
  - `HeadlineStat({ label, value, comparison, n }: { label: string; value: string; comparison?: string; n?: number })`: big number, comparison line under it, dimmed (`text-muted-foreground`) with `n = {n}` when `isSmallSample(n)`.
  - `ChartCard({ title, children })`: `section` with an `h2` title, the `StatCard` look.
  - `AttendanceTab({ orgId })`: reads `useStatsFilters().query`.
    - Headlines: Vinieron (`attended`), No-show (`no_show_rate`, `n = signed_up - cancelled`), Se bajaron (`cancellation_rate`, `n = signed_up`), Discretos (`walkin`), and in aggregate mode Eventos (`events`) with Promedio por evento (`avg_attended_per_event`).
    - Comparison text: `PREVIOUS_PERIOD` -> `"{+8%} vs. período anterior"` from `formatChange` (hidden when `null`); `PERIOD_AVERAGE` -> `"promedio: {comparison.avg_attended_per_event}"` for counts and the comparison rate for rates.
    - Chart: aggregate -> stacked `BarChart`, one bar per meetup in date order (attended, no-show, cancelled), x-axis `dd/mm`; one event -> a single horizontal stacked bar of the same parts. Colors from `--chart-1..3`. Chart container keeps an `aspect` or `min-h` (Recharts v3 needs it to measure).
    - States: skeleton while loading; error with Reintentar; when the error comes with a `meetup` param, also a "Ver todos los eventos" button that calls `setMeetupId(undefined)`; empty (`meetups.length === 0`) -> "No hay eventos finalizados en este período".
  - i18n keys (en / es): `statsAttended` "Attended" / "Vinieron"; `statsNoShowRate` "No-show" / "No-show"; `statsCancelRate` "Cancelled" / "Se bajaron"; `statsWalkinsHeadline` "Walk-ins" / "Discretos"; `statsEvents` "Events" / "Eventos"; `statsAvgPerEvent` "Average per event" / "Promedio por evento"; `statsVsPrevious` "{0} vs. previous period" / "{0} vs. período anterior"; `statsPeriodAverage` "average: {0}" / "promedio: {0}"; `statsSample` "n = {0}" / "n = {0}"; `statsEmptyPeriod` "No finalized events in this period" / "No hay eventos finalizados en este período"; `statsBackToAll` "See all events" / "Ver todos los eventos"; `statsAttendanceChart` "Attendance per event" / "Asistencia por evento". Reuse `retry` and `failedLoadStats`.

- [ ] **Step 1: Write the failing tests** (fixtures typed as `components["schemas"]["AttendanceStatsPublic"]`, full objects, no casts)
  - `shows a skeleton while loading` (pending promise).
  - `shows the error with retry, and "Ver todos los eventos" when an event is selected` (`/stats?meetup=x`, GET resolves `{ error: {...} }`); clicking it removes `meetup` from the URL.
  - `shows the empty state for a period without finalized events`.
  - `shows exact headline values in aggregate mode`: totals `attended=412, no_show_rate=0.18, cancellation_rate=0.1, walkin=12, events=5, avg_attended_per_event=82.4`, comparison `attended=381` -> "412", "18%", "10%", "12", "5", "82.4", "+8% vs. período anterior".
  - `dims a rate computed from fewer than 10 people and shows n`: `signed_up=7, cancelled=0` -> the No-show headline shows "n = 7" and has the muted class.
  - `shows a dash for null rates` (all-staff meetup: totals zero, rates `null`) -> "–", never "NaN".
  - `sends from, to and meetup_id to the API`: at `/stats?range=custom&from=2026-03-01&to=2026-03-31&meetup=m1`, `mockApiGet` was called with `{ params: { path: { org_id: "org-1" }, query: { from: "2026-03-01", to: "2026-04-01", meetup_id: "m1" } } }`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/features/stats/AttendanceTab.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** the hook, `HeadlineStat`, `ChartCard`, `AttendanceTab`, the strings, and wire the tab into `StatsPage`.

- [ ] **Step 4: Run all velvet tests**

Run: `npm run test:run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAttendanceStats.ts src/features/stats src/components src/lib/i18n.tsx src/features/meetups/MeetupStats.tsx
git commit -m "feat: add the Asistencia stats tab"
```

### Task 10: Velvet verification and PR

- [ ] **Step 1: Run the full gate**

Run: `npm run check && npm run test:run && npm run build`
Expected: no type, format, or lint errors; all tests pass; build succeeds.

- [ ] **Step 2: Check it in the browser** against the local backend with real-shaped data: `/stats` at 375px and 1280px wide, light and dark. Period changes, event changes, back button, the custom range, an org STAFF login (no nav entry, `/stats` redirects to `/dashboard`). Screenshot both widths for the PR.

- [ ] **Step 3: Run `/code-review` over the branch diff.** Fix real findings, note rejected ones with the reason.

- [ ] **Step 4: Push and open the PR** against `main`, titled `feat: statistics page with the Asistencia tab`, linking the backend PR and the spec, with the screenshots.
