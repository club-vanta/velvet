# Organization Statistics, Phase 3 (Demografía) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Demografía** tab: gender and age of the crowd, no-show by group, and whether the people who come differ from the people who sign up, backed by `GET /organizations/{org_id}/stats/demographics`.

**Architecture:** A new `app/services/stats/demographics.py` groups audience RSVPs of the scope by `GuestMazmoProfile.gender` and by age bucket in SQL (outer join, so unlinked guests land in "Sin dato"), using `attendance_status_expr()` for statuses. Velvet adds `DemographicsTab`, reusing `HeadlineStat`, `ChartCard`, the shared tab states, and `mazmoLabel` for gender names.

**Tech Stack:** as phase 1.

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md`, "Demografía" and "Constraints". Phase 1 and 2 plans' Global Constraints still apply.

## Global Constraints

- Phase 1 and phase 2 Global Constraints (single PR per repo at the end, branches `feat/org-stats-attendance` / `feat/org-statistics`, local type generation, audience, finalized only, Buenos Aires time, no em dashes, en/es strings).
- Unit of counting: one audience RSVP (an attendance), not a unique guest. A guest who came to 5 meetups counts 5 times in the aggregate. The tab says so in a `StatsNote` under its first chart.
- Groups for each RSVP:
  - Gender: `GuestMazmoProfile.gender` as stored (a Mazmo code such as `MALE`, `WOMAN_CIS`); null or empty string or no profile -> `None` (shown as "Sin dato"). `UNDEFINED` is a Mazmo choice and stays its own group.
  - Age bucket (`StatsAgeBucket` StrEnum, in this order): `AGE_18_24`, `AGE_25_29`, `AGE_30_34`, `AGE_35_39`, `AGE_40_49`, `AGE_50_PLUS`, `UNKNOWN`. Ages below 18 or above 99, null, or no profile -> `UNKNOWN` (Mazmo has fake ages like 126).
- Per group: `attended` (ATTENDED + WALKIN), `expected` (non-walk-in RSVPs with a status that are not CANCELLED, the people who were supposed to come), `no_show`, `no_show_rate = no_show / expected` (null on zero; same as phase 1's definition since expected = signed_up - cancelled), `attended_share = attended / total attended`, `expected_share = expected / total expected` (4 decimals, null on zero totals).
- Gender groups ordered by `attended` desc, then code asc, with `None` last. Age groups always all seven in the enum order.
- `median_age`: median of the ages (18..99) of attended RSVPs, `percentile_cont(0.5)`, rounded to 1 decimal; null when none.
- Comparison (`DemographicSummary`): `attended`, `median_age`, `known_age_share` (attended with a known age / attended), `gender_shares: list[{key, attended_share}]`, `age_shares: list[{key, attended_share}]`. Aggregate vs previous period, one event vs period. Velvet shows median age differences as "+1,5 años", shares in points.
- Gender labels in velvet only through `mazmoLabel(MAZMO_GENDER_LABEL, code, t)`; unknown codes show raw.

## Review Focus

1. **A guest with no Mazmo profile, or a profile with null age/gender** -> counted under Sin dato in both charts, never dropped, so the group totals equal the tab's attended total. Tests in Task 1.
2. **Fake ages (126, 3)** -> Sin dato, and they do not move the median. Test in Task 1.
3. **A gender code velvet does not know** (Mazmo adds one) -> shown as the raw code, not blank. Test in Task 3.
4. **A group with fewer than 10 expected** -> its no-show rate is dimmed with n. Test in Task 3.
5. **Only STAFF attended** -> all groups zero, shares null, median null, dashes in velvet. Tests in Task 1 and Task 3.

---

## Part A: Backend

### Task 1: Demographics service

**Files:** Create `app/services/stats/demographics.py`; modify `app/models/models.py` (`StatsAgeBucket`); test `tests/test_stats_demographics.py`.

**Interfaces (frozen dataclasses):**

- `DemographicGroup(key: str | None, attended: int, expected: int, no_show: int, no_show_rate: float | None, attended_share: float | None, expected_share: float | None)`; for age groups `key` is the `StatsAgeBucket` value.
- `GroupShare(key: str | None, attended_share: float | None)`.
- `DemographicSummary(attended: int, median_age: float | None, known_age_share: float | None, gender_shares: list[GroupShare], age_shares: list[GroupShare])`.
- `DemographicStats(gender: list[DemographicGroup], age: list[DemographicGroup], summary: DemographicSummary, comparison_kind: StatsComparisonKind | None, comparison: DemographicSummary | None)`.
- `age_bucket(age: int | None) -> StatsAgeBucket` (pure), `demographic_stats(session, org_id, period, meetup_id) -> DemographicStats`. The grouping happens in SQL (`GROUP BY` the gender expression and a `CASE` for the age bucket), outer-joining `GuestMazmoProfile` on `MeetupRsvp.guest_id`; reuse `finalized_meetup_conditions`, `AUDIENCE_GUEST_TYPES`, `attendance_status_expr()`. Keep the age-bucket SQL `CASE` and the Python `age_bucket` in one module with a parity test over ages `[None, 3, 17, 18, 24, 25, 29, 30, 34, 35, 39, 40, 49, 50, 99, 100, 126]`.

- [ ] **Step 1: Failing tests** (exact values):
  - `test_age_bucket_edges` and `test_age_bucket_sql_matches_python` (the parity list above).
  - `test_demographics_groups_by_gender_with_unknown_last` (DB): attended MALE x3, FEMALE x2, no profile x1, profile with gender "" x1; one FEMALE no-show -> gender groups `MALE(attended 3), FEMALE(attended 2, expected 3, no_show 1, no_show_rate 0.3333), None(attended 2)` in that order, attended_share `0.4286, 0.2857, 0.2857`.
  - `test_demographics_age_buckets_and_median` (DB): attended ages 22, 27, 31, 31, 45, 126, None -> bucket counts `1,1,2,0,1,0,2`, `median_age == 31.0`, `known_age_share == 0.7143`.
  - `test_demographics_counts_each_attendance` (DB): one guest attending two meetups in the period -> counted twice.
  - `test_demographics_only_staff_is_empty` (DB): zeros, shares and median null, still seven age rows.
  - Comparison tests mirroring attendance (previous period; one meetup vs period).
- [ ] **Step 2:** See them fail. **Step 3:** Implement. **Step 4:** Pass. **Step 5: Commit** `feat: compute gender and age stats for org meetups`

### Task 2: Demographics endpoint

**Files:** modify `app/schemas/stats.py`, `app/schemas/__init__.py`, `app/routers/stats.py` (via `stats_scope`), `app/openapi_examples/stats_examples.py`, `openapi.json`; test `tests/test_stats_demographics.py`.

- `GET /organizations/{org_id}/stats/demographics` -> `DemographicStatsPublic` (+ `DemographicGroupPublic`, `GroupSharePublic`, `DemographicSummaryPublic`), no defaults. Example with consistent numbers.
- [ ] Tests: 401; 403 staff; 200 org admin exact body; 200 with `meetup_id`; 404; 422; empty period. Regenerate openapi (diff only adds). Full backend gate. **Commit** `feat: add the org demographics stats endpoint`

---

## Part B: Velvet

### Task 3: Demografía tab

**Files:** generated `src/api/types.ts`; `src/lib/queryKeys.ts` (`statsDemographicsKey`); create `src/hooks/useDemographicsStats.ts`, `src/features/stats/DemographicsTab.tsx`, `src/features/stats/DemographicsTab.test.tsx`; modify `StatsPage.tsx` (tab `"demographics"`), `useStatsFilters.ts` (`StatsTab`), `statsFormat.ts` (`formatYearsChange`), `src/lib/i18n.tsx`.

**Interfaces:**

- Headlines: Edad mediana (`median_age` with one decimal, comparison `"+1,5 años vs. período anterior"` / `"promedio: 31,2"`), Con edad conocida (`known_age_share`, n = attended), Asistencias (`summary.attended`).
- Charts (each in a `ChartCard`):
  - Género: horizontal bars, one row per group, two bars per row: share of attended and share of expected (legend "Vinieron" / "Se esperaban"), labels via `mazmoLabel`, `None` -> "Sin dato". A `StatsNote` under it: `statsNoteGender`.
  - Edad: vertical bars per age bucket with the same two series.
  - No-show por grupo: a compact list (gender groups, then age buckets) with `formatRate(no_show_rate)`, dimmed with `n = expected` when small.
- i18n (en / es): `statsTabDemographics` "Demographics" / "Demografía"; `statsMedianAge` "Median age" / "Edad mediana"; `statsKnownAge` "Age known" / "Con edad conocida"; `statsAttendances` "Attendances" / "Asistencias"; `statsGender` "Gender" / "Género"; `statsAge` "Age" / "Edad"; `statsSeriesExpected` "Expected" / "Se esperaban"; `statsNoShowByGroup` "No-show by group" / "No-show por grupo"; `statsUnknown` "Unknown" / "Sin dato"; notes (via `StatsNote`, user request): `statsNoteGender` en "Gender comes from the Mazmo profile. Each attendance counts once, so someone who came to three events counts three times. Guests without a Mazmo profile show as Unknown." / es "El género sale del perfil de Mazmo. Cada asistencia cuenta una vez: alguien que vino a tres eventos cuenta tres veces. Quien no tiene perfil de Mazmo aparece como Sin dato."; `statsNoteAge` en "Age is today's age on Mazmo, not the age on the day of the event. Ages under 18 or over 99 are treated as Unknown, since some profiles have made-up ages." / es "La edad es la que figura hoy en Mazmo, no la que tenía el día del evento. Las edades menores de 18 o mayores de 99 cuentan como Sin dato, porque algunos perfiles tienen edades inventadas."; `statsYearsVsPrevious` "{0} years vs. previous period" / "{0} años vs. período anterior"; age bucket labels `statsAge18to24` "18-24" (same both), ..., `statsAge50Plus` "50+".
- `formatYearsChange(current, baseline)`: difference rounded to 1 decimal, sign shown, locale decimal separator; null when either is null.

- [ ] **Step 1: Failing tests:** loading, error, empty; both notes render with their exact Spanish text; exact headline values; gender rows labelled through `mazmoLabel` (MALE -> "Hombre", unknown code `NEW_CODE` -> "NEW_CODE", null -> "Sin dato"); dimmed small-n no-show row with "n = 4"; query params sent; `formatYearsChange` cases.
- [ ] **Step 2:** fail. **Step 3:** implement. **Step 4:** gates. **Step 5: Commit** `feat: add the Demografía stats tab`

### Task 4: Gate and browser check

- [ ] All gates; browser check on the demo backend (update the demo seed so genders are Mazmo codes) at 375px and 1280px, light and dark.
