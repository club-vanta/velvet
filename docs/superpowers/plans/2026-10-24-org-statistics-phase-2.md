# Organization Statistics, Phase 2 (Horarios) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Horarios** tab: when people arrive and how far ahead they sign up, backed by `GET /organizations/{org_id}/stats/arrivals`.

**Architecture:** The backend's stats router gains a shared scope dependency (period + optional meetup check) so each new endpoint is a few lines; a new `app/services/stats/arrivals.py` fetches minimal per-RSVP rows with SQL and buckets them in pure, unit-tested functions. Velvet reads the `tab` URL param, extracts the loading/error/empty states shared by every tab, and adds `ArrivalsTab`.

**Tech Stack:** as phase 1 (FastAPI, SQLModel, Postgres, pytest / React 19, TanStack Query, Recharts v3, Vitest).

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md`, sections "The page", "Which data counts", "Horarios". Phase 1 plan: `docs/superpowers/plans/2026-10-24-org-statistics-phase-1.md` (its Global Constraints still apply).

## Global Constraints

- Everything in phase 1's Global Constraints, except delivery: there is ONE backend PR and ONE velvet PR for all phases, opened at the end. Keep committing on backend branch `feat/org-stats-attendance` and velvet branch `feat/org-statistics`. Velvet types come from the local `../alter-tracker-backend/openapi.json` (`npx openapi-typescript ../alter-tracker-backend/openapi.json -o src/api/types.ts`, then prettier on it).
- Arrivals counted: audience RSVPs (`NORMAL`, `INVITED`) of finalized meetups in scope with `has_arrived` true and `arrival_time` not null (walk-ins included).
- Arrival buckets are 15 minutes. Aggregate: minutes relative to each meetup's start (`floor((arrival - start) / 15 min) * 15`, can be negative). One event: local clock time in `America/Argentina/Buenos_Aires`, floored to the quarter hour; its `start_minute` is that bucket's offset from the meetup start.
- The curve includes empty buckets between the first and last non-empty bucket, so it is continuous.
- Median and p90 arrival: the 50th and 90th percentile of arrival offsets in minutes from start (nearest-rank, `math.ceil(p * n)`-th smallest), as integers. First-hour share = arrivals with offset `< 60` (early arrivals included) / all arrivals, 4 decimals.
- Lead time: whole local days between the RSVP's `rsvp_time` date and the meetup's start date, both in Buenos Aires; negative clamps to 0. Buckets in this order: `SAME_DAY` (0), `ONE_DAY` (1), `TWO_THREE` (2-3), `FOUR_SEVEN` (4-7), `EIGHT_FOURTEEN` (8-14), `FIFTEEN_PLUS` (15+). Walk-ins excluded. Per bucket: `signed_up`, `cancelled`, `no_show`, `no_show_rate = no_show / (signed_up - cancelled)` (null on zero), statuses from `attendance_status_expr()`.
- Comparisons: aggregate vs previous period, one event vs the period, using the same `ArrivalSummary` shape. Velvet shows minute differences as "+5 min", share differences in points, counts in percent.
- Time labels: offsets as `+1:15` / `-0:10` (hours:minutes from start); clock times as `HH:MM` 24h.
- Tab names: es "Horarios", en "Timing". No em dashes.
- Data caveats are explained in the UI with a small quote-style note (user request 2026-10-24): a shared `StatsNote` component (a `<blockquote>`-like muted block with a left border, small text) placed under the card or chart it qualifies. Every caveat string in i18n en + es.

## Review Focus

1. **A meetup with no arrivals** (all no-shows, or only staff checked in) -> empty curve, null peak/median/p90/share, the tab shows dashes, not a crash. Tests in Task 2 and Task 5.
2. **Arrivals before the start** (people waiting at the door) -> negative offsets, buckets like `-15`, labels `-0:15`. Tests in Task 2 and Task 4.
3. **An event crossing midnight** (starts 23:00, arrivals at 00:30) -> one event's clock buckets go 23:00 ... 00:30 in order, not sorted as text. Test in Task 2.
4. **An RSVP made after the event started that is not a walk-in** -> lead time 0 (`SAME_DAY`), never negative. Test in Task 2.
5. **Switching tabs** -> the `tab` URL param changes, back returns to the previous tab, an unknown `tab` falls back to Asistencia, and the hidden tab's request is not made until it is shown. Tests in Task 4.

---

## Part A: Backend (`/home/krapp/dev/vanta/alter-tracker-backend`)

### Task 1: Shared stats scope dependency

**Files:**

- Modify: `app/routers/stats.py`
- Test: `tests/test_stats_attendance.py` (existing tests must pass unchanged)

**Interfaces:**

- Produces, in `app/routers/stats.py`: `@dataclass(frozen=True) class StatsScope: period: StatsPeriod; meetup_id: uuid.UUID | None` and `def stats_scope(org_id: uuid.UUID, from_date: ... = Query(alias="from"), to_date: ... = Query(alias="to"), meetup_id: ... = None, session: Session = Depends(get_session)) -> StatsScope`, raising the exact 422 and 404 details phase 1 defined. Each endpoint declares `scope: StatsScope = Depends(stats_scope)` plus `_admin: User = Depends(get_org_admin)`.
- The dependency must keep the query params documented in OpenAPI exactly as before (names `from`, `to`, `meetup_id`, same descriptions). Check `git diff openapi.json` after regenerating: no change for the attendance path.

- [ ] **Step 1:** Refactor `get_attendance_stats` onto the dependency. Make sure auth still runs before the 404 (the 401/403 tests prove it); if FastAPI resolves `stats_scope` first, add `_admin` as a dependency of `stats_scope` or order them so 401/403 win, and keep the existing tests green.
- [ ] **Step 2:** Run `tests/test_stats_attendance.py` and the generator; `git diff openapi.json` is empty.
- [ ] **Step 3: Commit** `refactor: share the stats period and meetup checks as a dependency`

### Task 2: Arrivals service

**Files:**

- Create: `app/services/stats/arrivals.py`
- Modify: `app/models/models.py` (add `StatsLeadTimeBucket` StrEnum next to `StatsComparisonKind`)
- Test: `tests/test_stats_arrivals.py`

**Interfaces (all frozen dataclasses):**

- `ArrivalBucket(start_minute: int, local_time: str | None, arrivals: int)`; `local_time` is `"HH:MM"` only in one-event mode.
- `ArrivalSummary(arrivals: int, peak: ArrivalBucket | None, median_minutes: int | None, p90_minutes: int | None, median_local_time: str | None, p90_local_time: str | None, first_hour_share: float | None)`. The two `*_local_time` fields are `"HH:MM"` (start + offset, Buenos Aires) only in one-event mode and for that event's own summary; `None` otherwise, including in comparisons.
- `LeadTimeRow(bucket: StatsLeadTimeBucket, signed_up: int, cancelled: int, no_show: int, no_show_rate: float | None)`; always all six buckets, in order, zeros included.
- `ArrivalStats(curve: list[ArrivalBucket], summary: ArrivalSummary, lead_time: list[LeadTimeRow], comparison_kind: StatsComparisonKind | None, comparison: ArrivalSummary | None)`.
- Pure functions: `arrival_curve(offsets: list[int], *, clock_starts: list[datetime] | None = None) -> list[ArrivalBucket]` (or an equivalent split you document), `summarize_arrivals(offsets: list[int], curve: list[ArrivalBucket]) -> ArrivalSummary`, `lead_time_bucket(days: int) -> StatsLeadTimeBucket`.
- `arrival_stats(session: Session, org_id: uuid.UUID, period: StatsPeriod, meetup_id: uuid.UUID | None) -> ArrivalStats`, same comparison rules as `attendance_stats`. SQL fetches only what is needed (meetup date, arrival_time, rsvp_time, is_walkin, status via `attendance_status_expr()`), filtered with `finalized_meetup_conditions` and `AUDIENCE_GUEST_TYPES`.

- [ ] **Step 1: Write the failing tests** (exact values):
  - `test_arrival_curve_buckets_relative_minutes`: offsets `[-10, 0, 5, 14, 15, 44, 90]` -> buckets `-15:1, 0:3, 15:1, 30:1, 45:0, 60:0, 75:0, 90:1` (empty ones in between).
  - `test_summarize_arrivals_percentiles_and_first_hour`: offsets `[-10, 0, 5, 14, 15, 44, 90]` -> `arrivals=7`, `median_minutes=14`, `p90_minutes=90`, `first_hour_share=0.8571`, `peak.start_minute=0`.
  - `test_summarize_arrivals_empty`: `[]` -> arrivals 0, everything else `None`, curve `[]`.
  - `test_lead_time_bucket_edges`: `0->SAME_DAY, 1->ONE_DAY, 2->TWO_THREE, 3->TWO_THREE, 4->FOUR_SEVEN, 7->FOUR_SEVEN, 8->EIGHT_FOURTEEN, 14->EIGHT_FOURTEEN, 15->FIFTEEN_PLUS, -2->SAME_DAY`.
  - `test_arrival_stats_one_event_uses_clock_time_across_midnight` (DB): meetup at local 23:00, arrivals at local 23:10 and 00:35 -> curve local_times `23:00, 23:15, 23:30, 23:45, 00:00, 00:15, 00:30` with arrivals `1,0,0,0,0,0,1`, start_minutes `0..90`.
  - `test_arrival_stats_excludes_staff_and_unarrived` (DB): STAFF arrived, NORMAL no-show, INVITED arrived -> `summary.arrivals == 1`.
  - `test_arrival_stats_lead_time_counts_and_rates` (DB): RSVPs made 0, 1, 5 and 20 local days before, one of the 5-day ones a no-show and one cancelled, plus a walk-in -> exact rows for all six buckets (walk-in absent).
  - `test_arrival_stats_aggregate_compares_with_previous_period` and `test_arrival_stats_single_meetup_compares_with_period` (DB), mirroring the attendance tests.
- [ ] **Step 2:** Run, see them fail (ModuleNotFoundError).
- [ ] **Step 3:** Implement. Do the time math in Python with `zoneinfo` from `STATS_TZ`; DB datetimes may come back naive (test DB) or aware (production `timestamptz`), so normalize to aware UTC once on read.
- [ ] **Step 4:** Run, see them pass.
- [ ] **Step 5: Commit** `feat: compute arrival times and sign-up lead time for org stats`

### Task 3: Arrivals endpoint

**Files:**

- Modify: `app/schemas/stats.py`, `app/schemas/__init__.py`, `app/routers/stats.py`, `app/openapi_examples/stats_examples.py`, `openapi.json`
- Test: `tests/test_stats_arrivals.py`

**Interfaces:**

- `GET /organizations/{org_id}/stats/arrivals` using `StatsScope`, response `ArrivalStatsPublic` mirroring the dataclasses (`ArrivalBucketPublic`, `ArrivalSummaryPublic`, `LeadTimeRowPublic`), no defaults, `from_attributes=True`. Router docstring lists the new route. Responses: 200 example (consistent numbers), 401, 403 admin required, 404 meetup, 422.

- [ ] **Step 1: Write the failing endpoint tests**: 401; 403 staff; 200 org admin with exact body for a small fixture (aggregate); 200 with `meetup_id` (exact `comparison_kind` and summary); 404 unfinalized meetup; 422 reversed period; empty period (curve `[]`, summary nulls, six zero lead-time rows).
- [ ] **Step 2:** Run, see them fail (404 route).
- [ ] **Step 3:** Implement, regenerate `openapi.json` (`direnv exec . uv run python -m scripts.generate_openapi`); its diff only adds the new path and schemas.
- [ ] **Step 4:** Full gate: pytest (`-o addopts=""`), basedpyright, ruff check, ruff format --check.
- [ ] **Step 5: Commit** `feat: add the org arrival stats endpoint`

---

## Part B: Velvet (`/home/krapp/dev/vanta/velvet`)

### Task 4: Tab routing, shared tab states, arrivals plumbing

**Files:**

- Modify: `src/api/types.ts` (generated), `src/lib/queryKeys.ts`, `src/features/stats/useStatsFilters.ts`, `src/features/stats/StatsPage.tsx`, `src/features/stats/AttendanceTab.tsx`, `src/features/stats/statsFormat.ts`, `src/lib/i18n.tsx`
- Create: `src/features/stats/StatsTabState.tsx` (skeleton grid, error with Reintentar and "Ver todos los eventos", empty state, moved out of `AttendanceTab`), `src/hooks/useArrivalsStats.ts`
- Test: `src/features/stats/StatsPage.test.tsx`, `src/features/stats/statsFormat.test.ts`, `src/features/stats/AttendanceTab.test.tsx` (still green)

**Interfaces:**

- `type StatsTab = "attendance" | "arrivals"`; `useStatsFilters` reads `tab` from the URL with fallback `"attendance"`; `setTab` pushes history.
- `statsArrivalsKey(orgId, query)` under `statsOrgKey`. `useArrivalsStats(orgId, query)` mirrors `useAttendanceStats` (skipToken while null, `failedLoadOrgStats`).
- `formatOffset(minutes: number): string` (`75 -> "+1:15"`, `-10 -> "-0:10"`, `0 -> "+0:00"`), `formatMinuteChange(current, baseline): number | null` (difference in whole minutes).
- Tabs follow the phase 1 tab props contract (`StatsTabProps`: `src/features/stats/statsTab.ts`). Only the active tab mounts, so hidden tabs make no request: check whether the base-ui `TabsContent` in `src/components/ui/tabs.tsx` keeps hidden panels mounted, and if it does, render only the active tab's component.
- The `TabsList` scrolls sideways on phones (`overflow-x-auto`, no wrap) per the spec.
- i18n: `statsTabArrivals` "Timing" / "Horarios".
- Create `src/features/stats/StatsNote.tsx` (`StatsNote({ children })`, renders a `blockquote` with `border-l-2 pl-3 text-xs text-muted-foreground`, 4.5:1 contrast) and add it to the Asistencia tab with `statsNoteAttendance` en "Only finalized events count. Staff and vendors are left out. A walk-in who never checked in is not counted." / es "Solo cuentan los eventos finalizados. El staff y los vendors no se cuentan. Un discreto que nunca hizo check-in no cuenta.". Test that the note renders.

- [ ] **Step 1: Failing tests**: `?tab=arrivals` selects Horarios; `?tab=bogus` shows Asistencia; clicking Horarios writes `tab=arrivals` and Back returns to Asistencia; at `?tab=attendance` the arrivals endpoint is not called; formatOffset/formatMinuteChange cases above.
- [ ] **Step 2:** See them fail. **Step 3:** Implement (generate types first). **Step 4:** All velvet tests pass.
- [ ] **Step 5: Commit** `feat: route stats tabs through the URL and share the tab states`

### Task 5: Horarios tab

**Files:**

- Create: `src/features/stats/ArrivalsTab.tsx`, `src/features/stats/ArrivalsTab.test.tsx`
- Modify: `src/features/stats/StatsPage.tsx`, `src/lib/i18n.tsx`

**Interfaces:**

- Headlines (`HeadlineStat`): Pico de llegada (peak label: offset in aggregate, clock time for one event; value is the label, comparison none), Llegó el 50% (`median_local_time` in one-event mode, else `formatOffset(median_minutes)`), Llegó el 90% (same with p90), En la primera hora (share via `formatRate`, `n = arrivals`). Comparison lines: minutes as `"+5 min vs. período anterior"` / `"promedio: +1:05"`; share in points.
- Charts: arrival curve as a `BarChart` (one bar per bucket, x labels `formatOffset(start_minute)` in aggregate, `local_time` in one-event mode); lead time as a `BarChart` of `signed_up` per bucket with the no-show rate per bucket listed under it (dimmed when `signed_up - cancelled < 10`).
- i18n (en / es): `statsPeakArrival` "Peak arrival" / "Pico de llegada"; `statsHalfArrived` "50% arrived by" / "Llegó el 50%"; `statsNinetyArrived` "90% arrived by" / "Llegó el 90%"; `statsFirstHour` "In the first hour" / "En la primera hora"; `statsArrivalCurve` "Arrivals every 15 minutes" / "Llegadas cada 15 minutos"; `statsLeadTime` "How early people sign up" / "Con cuánta anticipación se anotan"; `statsLeadSameDay` "Same day" / "El mismo día"; `statsLeadOneDay` "1 day" / "1 día"; `statsLeadTwoThree` "2-3 days" / "2-3 días"; `statsLeadFourSeven` "4-7 days" / "4-7 días"; `statsLeadEightFourteen` "8-14 days" / "8-14 días"; `statsLeadFifteenPlus` "15+ days" / "15+ días"; `statsMinutesVsPrevious` "{0} min vs. previous period" / "{0} min vs. período anterior"; `statsNoArrivals` "Nobody checked in" / "Nadie hizo check-in"; notes via `StatsNote`: `statsNoteArrivals` "Times use the check-in at the door. In the aggregate, minutes count from each event's start so events at different hours line up." / "Los horarios salen del check-in en la puerta. En el agregado, los minutos se cuentan desde el inicio de cada evento para que eventos a distintas horas se puedan comparar." and `statsNoteLeadTime` "Walk-ins are left out because they never signed up." / "Los discretos no se cuentan porque nunca se anotaron.".

- [ ] **Step 1: Failing tests** (fixtures typed `components["schemas"]["ArrivalStatsPublic"]`, full objects): loading skeleton; error + retry; empty period; exact headlines in aggregate (`+0:30`, `+0:45`, `+1:30`, `86%`, `+5 min vs. período anterior`); one-event mode labels use clock times; no arrivals -> dashes and "Nadie hizo check-in"; lead-time rows show exact counts and a dimmed small-n rate; query params sent.
- [ ] **Step 2:** See them fail. **Step 3:** Implement. **Step 4:** All gates.
- [ ] **Step 5: Commit** `feat: add the Horarios stats tab`

### Task 6: Gate and browser check

- [ ] Velvet `npm run check`, `npm run test:run`, `npm run build`; backend gates.
- [ ] Browser check on the demo backend (`:8001`, DB `alter_stats_demo`) at 375px and 1280px, light and dark: tab bar scrolls on phones, both charts readable, one-event mode, Back across tabs.
