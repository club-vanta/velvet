# Organization Statistics, Phase 4 (Fidelidad) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Fidelidad** tab: new vs returning people, whether first-timers come back, monthly cohorts, how often people come, and regulars who stopped coming, backed by `GET /organizations/{org_id}/stats/retention`.

**Architecture:** A new `app/services/stats/retention.py` builds one SQL CTE of audience attendances (guest, meetup, local date) over the org's finalized meetups of all time, and derives every metric from it, so "first time ever" does not depend on the selected period. Velvet adds `RetentionTab` with a sideways-scrolling cohort table and a list of lapsed regulars linking to guest profiles.

**Tech Stack:** as phase 1.

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md`, "Fidelidad" and the call "Earlier attendance as STAFF or VENDOR does not count as a guest's first time".

## Global Constraints

- Phase 1-3 Global Constraints (single PR per repo, branches, local type generation, finalized only, audience only, Buenos Aires time, no em dashes, en/es strings, `StatsNote` for data caveats).
- An **attendance** is an audience RSVP (`NORMAL`, `INVITED`) with status `ATTENDED` or `WALKIN` (via `attendance_status_expr()`) on a finalized meetup of the org. Every metric here counts **unique guests**, not attendances.
- A guest's **first time** is their earliest attendance (by `Meetup.date`) in this org over all time, regardless of the selected period. Ties on the same meetup are impossible (one RSVP per guest per meetup).
- In scope (period, or the one meetup): `attendees` = unique guests with an attendance; `new_guests` = attendees whose first time is in scope; `returning` = attendees - new_guests; `new_share` = new_guests / attendees (4 decimals, null on 0).
- **First-timer return rate**: of the guests whose first time is in scope, the share with any later attendance (any date after their first, even after the period ends, up to now). Null when there are none.
- **Per meetup** (aggregate only): for each finalized meetup in the period in date order, `new` and `returning` attendee counts.
- **Cohorts** (aggregate only): one row per local calendar month (`YYYY-MM`) in which guests had their first time, limited to first times inside the period; `size` = guests in the cohort; `retention` = list of shares for months 1..12 after the cohort month (month 0 is omitted since it is always 100%), each = guests of the cohort with an attendance in that calendar month / size, 4 decimals; months after the current local month are omitted (the list is shorter), never reported as 0.
- **Frequency** (aggregate only): attendees grouped by attendances in scope: `ONE` (1), `TWO` (2), `THREE_FIVE` (3-5), `SIX_PLUS` (6+), always all four in order (`StatsFrequencyBucket` StrEnum).
- **Lapsed regulars** (aggregate only, and only when the period has a start): guests with 3 or more attendances before the period start and none in the period. Each: `guest_id`, `displayname`, `attended_before`, `last_attended` (datetime of the last attendance). Sorted by `attended_before` desc, then `last_attended` desc; at most 50, plus `lapsed_total` with the full count.
- **One event**: `attendees`, `new_guests`, `returning`, `new_share`, and of this event's first-timers how many came back later (`first_timer_return_rate` over that event's first-timers). Per meetup, cohorts, frequency, lapsed are empty lists / null.
- Comparison (`RetentionSummary`): `attendees`, `new_guests`, `new_share`, `first_timer_return_rate`. Aggregate vs previous period; one event vs the period.

## Review Focus

1. **A guest whose first attendance was before the period** -> returning in the period, even if they did not come in the previous period. Test in Task 1.
2. **A guest who first came as STAFF and later as NORMAL** -> their first time is the first NORMAL attendance. Test in Task 1.
3. **First-timers in the last weeks** -> they had little time to come back; the rate is still computed but a `StatsNote` says so. Test (note text) in Task 3.
4. **"All time" period** -> no lapsed list (no start); cohort rows for every month with first times. Test in Task 1.
5. **A guest with a walk-in only** -> their walk-in counts as an attendance and as their first time. Test in Task 1.

---

## Part A: Backend

### Task 1: Retention service

**Files:** create `app/services/stats/retention.py`; modify `app/models/models.py` (`StatsFrequencyBucket`); test `tests/test_stats_retention.py`.

**Interfaces (frozen dataclasses):** `MeetupNewReturning(meetup_id, name, date, new: int, returning: int)`, `CohortRow(month: str, size: int, retention: list[float])`, `FrequencyRow(bucket: StatsFrequencyBucket, guests: int)`, `LapsedRegular(guest_id: uuid.UUID, displayname: str, attended_before: int, last_attended: datetime)`, `RetentionSummary(attendees: int, new_guests: int, returning: int, new_share: float | None, first_timer_return_rate: float | None)`, `RetentionStats(summary, meetups: list[MeetupNewReturning], cohorts: list[CohortRow], frequency: list[FrequencyRow], lapsed: list[LapsedRegular], lapsed_total: int | None, comparison_kind, comparison: RetentionSummary | None)`; `retention_stats(session, org_id, period, meetup_id, *, today: date | None = None) -> RetentionStats` (`today` defaults to the current Buenos Aires date; tests pass it). Use the shared `ratio` helper from `scope.py`.

- [ ] **Step 1: Failing tests** (exact values; build meetups monthly with a helper):
  - `test_retention_new_and_returning_in_period`: guest A first came in January, B and C first in March; period March -> attendees 3, new 2, returning 1, new_share 0.6667.
  - `test_retention_staff_attendance_is_not_a_first_time`: guest attended in January as STAFF, in March as NORMAL; period March -> new 1.
  - `test_retention_walkin_counts_as_first_time`.
  - `test_retention_first_timer_return_rate_looks_past_the_period`: B first in March and back in May, C first in March only; period March -> 0.5.
  - `test_retention_cohorts_by_month`: cohort 2026-01 of 4 guests, 2 back in 2026-02, 1 in 2026-03, `today=2026-03-15` -> `CohortRow("2026-01", 4, [0.5, 0.25])`.
  - `test_retention_frequency_buckets`: attendees with 1, 2, 4 and 6 attendances in the period -> `[1, 1, 1, 1]`.
  - `test_retention_lapsed_regulars`: D with 3 before and none in the period is listed with `attended_before=3`; E with 3 before and 1 in the period is not; all-time period -> `lapsed == []` and `lapsed_total is None`.
  - `test_retention_one_event` and comparison tests mirroring attendance.
- [ ] **Step 2:** fail. **Step 3:** implement (one CTE of attendances; window `min(date) over (partition by guest)` for first times; Python only for shaping). **Step 4:** pass. **Step 5: Commit** `feat: compute retention stats for org meetups`

### Task 2: Retention endpoint

- `GET /organizations/{org_id}/stats/retention` via `stats_scope`, `RetentionStatsPublic` and nested public schemas (no defaults), consistent example, regenerated `openapi.json`.
- [ ] Tests: 401; 403 staff; 200 org admin exact body; 200 with `meetup_id`; 404; 422; empty period. Full gate. **Commit** `feat: add the org retention stats endpoint`

---

## Part B: Velvet

### Task 3: Fidelidad tab

**Files:** generated types; `queryKeys.ts` (`statsRetentionKey`); create `src/hooks/useRetentionStats.ts`, `src/features/stats/RetentionTab.tsx`, `src/features/stats/CohortTable.tsx`, tests; modify `StatsPage.tsx`, `useStatsFilters.ts` (`"retention"`), `i18n.tsx`.

- Headlines: Personas (`attendees`), Primera vez (`new_guests` with `new_share` as the comparison-free subline "41% del total"), Volvieron (`first_timer_return_rate`, `n` = first-timers). Comparisons as in phase 1 (counts in %, rates in pts).
- Aggregate charts: Nuevas y conocidas por evento (stacked bars per meetup, `new` / `returning`, `formatEventDay`), Frecuencia (bars for the four buckets), Cohortes (`CohortTable`: a `<table>` with month rows and "+1".."+12" columns, cells as `formatRate`, background intensity by value via an inline `color-mix` with `--chart-2`, inside `overflow-x-auto`; cohorts with size < 10 dimmed), Dejaron de venir (list of up to 50 links to `/guests/{guest_id}` showing displayname, "vino N veces", last date; "y X más" when `lapsed_total` > shown).
- One-event mode: headlines only, plus a line "De quienes vinieron por primera vez, volvieron X".
- Notes (`StatsNote`): `statsNoteRetention` en "First time means the first event of this organization a person attended, ever. Coming as staff does not count." / es "Primera vez es el primer evento de esta organización al que la persona vino, desde siempre. Venir como staff no cuenta."; `statsNoteReturnRate` en "People who came for the first time recently have had little time to come back." / es "Quienes vinieron por primera vez hace poco tuvieron poco tiempo para volver."; `statsNoteCohorts` en "Each row is the people whose first time was that month; each column, the share who came again N months later." / es "Cada fila son las personas cuya primera vez fue ese mes; cada columna, qué parte volvió N meses después."; `statsNoteLapsed` en "People who came 3 or more times before this period and not during it." / es "Personas que vinieron 3 veces o más antes de este período y ninguna durante él.".
- Other i18n (en / es): `statsTabRetention` "Loyalty" / "Fidelidad"; `statsPeople` "People" / "Personas"; `statsFirstTime` "First time" / "Primera vez"; `statsCameBack` "Came back" / "Volvieron"; `statsShareOfTotal` "{0} of all" / "{0} del total"; `statsNewReturning` "New and returning per event" / "Nuevas y conocidas por evento"; `statsSeriesNew` "New" / "Nuevas"; `statsSeriesReturning` "Returning" / "Conocidas"; `statsFrequency` "How often people come" / "Cada cuánto vienen"; `statsFreqOne` "1 time" / "1 vez"; `statsFreqTwo` "2 times" / "2 veces"; `statsFreqThreeFive` "3-5 times" / "3-5 veces"; `statsFreqSixPlus` "6+ times" / "6+ veces"; `statsCohorts` "Cohorts" / "Cohortes"; `statsCohortMonth` "First month" / "Primer mes"; `statsCohortSize` "People" / "Personas"; `statsLapsed` "Stopped coming" / "Dejaron de venir"; `statsLapsedCame` "came {0} times" / "vino {0} veces"; `statsLapsedMore` "and {0} more" / "y {0} más"; `statsEventCameBack` "Of the first-timers, {0} came back" / "De quienes vinieron por primera vez, volvieron {0}".
- [ ] Tests: loading, error, empty; exact headlines; cohort table cells and a dimmed small cohort; cohort table is inside a horizontally scrollable container; lapsed list links and "y 3 más"; one-event mode hides aggregate sections; notes render; query params. Gates. **Commit** `feat: add the Fidelidad stats tab`

### Task 4: Gate and browser check

- [ ] All gates; browser check at 375px (cohort table scrolls sideways inside its card, page does not) and 1280px, light and dark.
