# Weather Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Clima stats tab show the weather before and during an event against its arrivals, and keep only the two temperature charts in the all-events view with a before/during switch.

**Architecture:** The backend widens the Open-Meteo window to 3 hours before the start, stores a before summary next to the existing during one, and returns the hourly series for one event. Velvet draws a stacked meteogram (icons, temperature, rain, arrivals) from that series plus the existing arrivals curve.

**Tech Stack:** FastAPI, SQLModel, Alembic, httpx, pytest (backend); React 19, TanStack Query, Recharts via shadcn `ChartContainer`, Vitest, `@bybas/weather-icons` (velvet).

**Spec:** `docs/superpowers/specs/2026-10-26-weather-tab-redesign-design.md`

## Global Constraints

- Before window: hours `t` with `floor_hour(start) - 3h <= t < floor_hour(start)`. During window unchanged: `floor_hour(start) <= t < start + 6h`.
- Rain threshold stays `>= 0.2` mm; averages and sums rounded to 1 decimal; nulls skipped per series.
- New hourly variables requested: `weather_code`, `is_day`.
- One backend PR, then velvet after it is merged and deployed. The user accepted a short broken Clima tab between deploys.
- Velvet: every string in `src/lib/i18n.tsx` in English and Spanish; no `useMemo`/`useCallback` without a measurement; fixtures satisfy full generated types; no em dashes anywhere.
- Icons: `@bybas/weather-icons` 2.x, `production/line/all` SVGs, animations off under `prefers-reduced-motion`.
- URL param for the toggle: `weather_window`, values `before`; absent or unknown means `during`.

## Review Focus

- A meetup starting at :30 (22:30): before is 19:00 to 22:00, during 22:00 to 04:00, chart domain -210 to +390. Tests in Task B1 and Task V4.
- A night crossing UTC midnight where the before window starts on the previous UTC date (start 01:30 UTC): the request covers both dates. Test in Task B1.
- Before window entirely null while during has data (and the reverse): row stored, the empty window's summary is all null, the card shows a dash, not "Sin lluvia". Tests in Task B1 and Task V3.
- Arrivals outside the weather domain (curve reaches -120 and +720): bars outside the domain are dropped, not squeezed. Test in Task V4.
- Arrivals query failing while weather succeeds: weather strips render, the arrivals strip shows a note. Test in Task V4.

---

## Part 1: Backend (`/home/krapp/dev/vanta/alter-tracker-backend`, branch `feat/weather-before-window` from `main`)

Verification for every backend task: `pytest -q` and `ruff check . && ruff format --check .` (see the repo `CLAUDE.md` scripts).

### Task B1: Window and summaries in the weather service

**Files:**

- Modify: `app/services/weather.py` (module docstring Request/Window/Summary, `_HOURLY_VARIABLES`, `WeatherSummary`, `summarize_weather`, `fetch_hourly`, `_parse`)
- Test: `tests/test_weather.py`

**Interfaces:**

- Produces:
  - `_HOURLY_VARIABLES = ("temperature_2m", "apparent_temperature", "precipitation", "wind_speed_10m", "weather_code", "is_day")`; `_BEFORE = timedelta(hours=3)`.
  - `@dataclass(frozen=True) class WindowSummary: avg_temperature, avg_apparent_temperature, total_precipitation_mm: float | None; rained: bool | None`
  - `WeatherSummary` keeps its during fields and `max_wind_kmh`, adds `before: WindowSummary`, and `hourly` now holds the whole 9 to 10 hour window (before plus during) with all six variables.
  - `summarize_weather(hourly, start) -> WeatherSummary | None`: None only when every summarized series (temperature, apparent, precipitation, wind) is empty in both windows.
  - `fetch_hourly` asks from the UTC date of `floor_hour(start) - 3h` to the UTC date of the window end.

- [ ] **Step 1: Update fixtures and write failing tests.** `hourly_payload` gains `weather_code` and `is_day` (defaults: `3` and `0` per hour). Tests:
  - `test_summarize_weather_splits_before_and_during_for_a_half_past_start`: START 22:30 with a payload from 19:00; before uses 19, 20, 21 and during 22 through 04; assert exact `before.avg_temperature`, `before.total_precipitation_mm`, `before.rained` and during values.
  - `test_summarize_weather_before_is_all_null_when_its_hours_are_null` and `test_summarize_weather_keeps_before_when_during_is_null` (row still returned).
  - `test_summarize_weather_returns_none_when_both_windows_are_empty`.
  - `test_summarize_weather_keeps_the_whole_window_in_hourly`: `hourly["time"]` runs 19:00 to 04:00 and includes `weather_code`, `is_day`.
  - `test_client_asks_for_the_previous_day_when_before_crosses_midnight`: start 01:30 UTC, `start_date` is the previous date.
  - Update `test_client_sends_the_exact_query_params` for the new `hourly` list and dates; update existing summary tests whose 20:00/21:00 "outside" points now fall in before.
- [ ] **Step 2:** `pytest tests/test_weather.py -q`, expect the new tests to FAIL.
- [ ] **Step 3: Implement.** Factor the per-window math into one helper `_window_summary(used: HourlyData) -> WindowSummary` used for both windows; `_parse` validates the two new series as numeric or null like the others. Update the module docstring sections.
- [ ] **Step 4:** `pytest tests/test_weather.py -q`, expect PASS.
- [ ] **Step 5:** Commit `feat: fetch the 3 hours before a meetup and summarize them apart`.

### Task B2: Store the before summary and refetch every row

**Files:**

- Create: `alembic/versions/0025_meetup_weather_before.py`
- Modify: `app/models/models.py` (`MeetupWeather` columns and docstring), `app/services/weather.py` (`fetch_and_store_weather`)
- Test: `tests/test_weather.py`, `tests/test_weather_worker.py` if a fixture builds rows

**Interfaces:**

- Consumes: `WeatherSummary.before` from B1.
- Produces: `MeetupWeather.before_avg_temperature`, `before_avg_apparent_temperature`, `before_total_precipitation_mm: float | None`, `before_rained: bool | None`.

- [ ] **Step 1: Failing test** `test_fetch_and_store_weather_writes_the_before_summary`: asserts the four `before_*` columns with exact values and that `hourly` keeps the whole window.
- [ ] **Step 2:** run, expect FAIL.
- [ ] **Step 3: Implement.** Migration 0025 (revises 0024): add the four nullable columns, then `DELETE FROM meetup_weather` so the worker (which only fills meetups without a row) fetches every meetup again with the new window. Docstring says so. Downgrade drops the columns. Upsert writes the new fields.
- [ ] **Step 4:** `pytest -q`, expect PASS (migration runs in the test DB setup).
- [ ] **Step 5:** Commit `feat: store the weather before a meetup and refetch stored rows`.

### Task B3: Stats API for the new tab

**Files:**

- Modify: `app/services/stats/weather.py`, `app/schemas/stats.py` (and `app/schemas/__init__.py` exports), `app/openapi_examples/stats_examples.py`, `openapi.json`
- Test: `tests/test_stats_weather.py`, `tests/test_stats_examples.py`

**Interfaces:**

- Produces (service dataclasses mirror the schemas):
  - `WeatherWindowPublic`: `avg_temperature`, `avg_apparent_temperature`, `total_precipitation_mm: float | None`, `rained: bool | None`.
  - `WeatherHourPublic`: `time: datetime`, `offset_minutes: int`, `temperature`, `apparent_temperature`, `precipitation_mm: float | None`, `weather_code: int | None`, `is_day: bool | None`.
  - `WeatherEventPublic(MeetupWeatherStatusPublic)`: drops `attended`, `no_show_rate`; adds `before: WeatherWindowPublic | None` (null without a row), `hours: list[WeatherHourPublic]` (empty without a row).
  - `WeatherMeetupRowPublic` adds `before_avg_temperature: float | None`.
  - `WeatherStatsPublic`: removes `rainy`, `dry`, `without_weather`; adds `temperature_bands_before: list[TemperatureBandRowPublic]`. Delete `WeatherGroupPublic`, `WeatherGroup`, `_group`.
  - `offset_minutes = int((hour_time - start).total_seconds() // 60)` with both in UTC (22:00 hour for a 22:30 start is -30).

- [ ] **Step 1: Failing tests:**
  - `test_weather_stats_event_returns_before_and_hours_with_offsets`: 22:30 meetup with a stored row; `hours[0].offset_minutes == -210`, last `== 330`, `weather_code` and `is_day` mapped (`is_day` 1 -> True), `before` exact values.
  - `test_weather_stats_event_without_row_has_no_before_and_no_hours`.
  - `test_weather_stats_bands_before_use_the_before_average`: two meetups whose before and during temperatures fall in different bands; assert both band lists.
  - `test_weather_stats_rows_carry_before_avg_temperature`.
  - Delete tests for rainy, dry and without_weather; update example tests.
- [ ] **Step 2:** run, expect FAIL.
- [ ] **Step 3: Implement.** `_band_rows` takes a temperature getter so both band lists share it. Update docstrings of `weather_stats` and `WeatherStatsPublic`. Update examples; regenerate `openapi.json` the way the repo does (see `CLAUDE.md`).
- [ ] **Step 4:** `pytest -q`, `ruff check .`, `ruff format --check .`, expect clean.
- [ ] **Step 5:** Commit `feat: return the before window and hourly weather in weather stats`.

### Task B4: Review and PR

- [ ] Run `/code-review` (or the code-reviewer agent) over the branch diff; fix real findings, note rejected ones with a reason.
- [ ] Push and open the PR against `main`. Do not merge or deploy (the user does).

---

## Part 2: Velvet (`/home/krapp/dev/vanta/velvet`, branch `feat/weather-tab-redesign` from `main`)

Velvet builds against the backend branch locally: run the backend from `feat/weather-before-window` and `npm run generate:api` against it (or copy its `openapi.json` the way `generate:api` reads it).

Verification for every velvet task: `npm run check`, `npm run test:run`, and `npm run build` before the final commit.

### Task V1: Types, icon dependency, icon map

**Files:**

- Modify: `package.json`, `package-lock.json`, `src/api/types.ts` (generated)
- Create: `src/features/stats/weatherIcon.ts`, `src/features/stats/weatherIcon.test.ts`
- Modify: `src/lib/i18n.tsx` (condition labels)

**Interfaces:**

- Produces: `weatherIcon(code: number | null, isDay: boolean | null): { src: string; label: TranslationKey } | null`. `src` is the Vite asset URL of `@bybas/weather-icons/production/line/all/<name>.svg`. Null code returns null. Night uses the `-night` variant where one exists, day the `-day` one, otherwise the plain name.

- [ ] **Step 1:** `npm install @bybas/weather-icons@2` and `npm run generate:api`. Commit the spec doc in this branch too.
- [ ] **Step 2: Failing tests** in `weatherIcon.test.ts`: `0` day -> `clear-day`/`weatherClear`; `0` night -> `clear-night`; `2` night -> `partly-cloudy-night`; `3` -> `overcast` (day/night variant); `61`, `63`, `65` -> `rain`; `51` -> `drizzle`; `95` -> `thunderstorms`; `71` -> `snow`; `45` -> `fog`; null -> null.
- [ ] **Step 3: Implement** the WMO map (groups: 0 clear, 1-2 partly cloudy, 3 overcast, 45/48 fog, 51-57 drizzle, 61-67 and 80-82 rain, 71-77 and 85-86 snow, 95-99 thunderstorms) with i18n labels `weatherClear`, `weatherPartlyCloudy`, `weatherOvercast`, `weatherFog`, `weatherDrizzle`, `weatherRain`, `weatherSnow`, `weatherStorm` (es: "Despejado", "Parcialmente nublado", "Nublado", "Niebla", "Llovizna", "Lluvia", "Nieve", "Tormenta").
- [ ] **Step 4:** tests PASS.
- [ ] **Step 5:** Commit `feat: map weather codes to Meteocons line icons`.

### Task V2: All events view keeps two charts with a before/during toggle

**Files:**

- Modify: `src/features/stats/WeatherTab.tsx` (`WeatherAggregate`, `scatterPoints`, remove `GroupStat`, `WithoutWeatherList`, cards), `src/lib/i18n.tsx`
- Test: `src/features/stats/WeatherTab.test.tsx`

**Interfaces:**

- Produces: `type WeatherWindow = "before" | "during"`, `useUrlView("weather_window", ["before", "during"], "during")`.

- [ ] **Step 1: Failing tests:** no "Con lluvia", "Sin lluvia" or without-weather texts render; the toggle group "Antes / Durante" exists with "Durante" pressed; clicking "Antes" makes the bands table show `temperature_bands_before` rows and the scatter text table show `before_avg_temperature` values (exact cells); `?weather_window=before` in the initial URL starts on "Antes".
- [ ] **Step 2:** run, expect FAIL.
- [ ] **Step 3: Implement.** One `ViewToggle` above both `ChartCard`s; `scatterPoints(meetups, window)` picks the field. Remove the headline grid, notes that explain only removed parts, `WithoutWeatherList`, and their i18n keys. Skeleton card count for the aggregate becomes 0 if `StatsTabGate` supports it, otherwise keep the gate's chart skeleton only.
- [ ] **Step 4:** tests PASS.
- [ ] **Step 5:** Commit `feat: keep the temperature charts on Clima with a before/during switch`.

### Task V3: One event summary cards

**Files:**

- Create: `src/features/stats/WeatherWindowCard.tsx`
- Modify: `src/features/stats/WeatherTab.tsx` (`WeatherEvent`), `src/lib/i18n.tsx`
- Test: `src/features/stats/WeatherTab.test.tsx`

**Interfaces:**

- Produces: `WeatherWindowCard({ title, range, summary }: { title: string; range: string; summary: WeatherWindowSummary | null })` where `WeatherWindowSummary` is the shared shape of `WeatherWindowPublic` and the during fields of `MeetupWeatherPublic`.

- [ ] **Step 1: Failing tests:** event mode shows no attended or no-show cards; "Antes del inicio · 19:00 a 22:00" card shows `4,1 mm de lluvia`, `13,5°`, `(se sentía 10°)`; "Durante · 22:00 a 04:00" card from `weather` shows `Sin lluvia`; a null before summary shows a dash with an `aria-describedby` explanation; status `PENDING`/`NO_LOCATION` keeps today's messages from `WeatherDetails` instead of the meteogram.
- [ ] **Step 2:** run, expect FAIL.
- [ ] **Step 3: Implement.** Ranges come from the first/last `hours` times with `formatTime`. Without a row (status not OK) render `WeatherDetails` as today so the location and pending messages stay.
- [ ] **Step 4:** tests PASS.
- [ ] **Step 5:** Commit `feat: show the weather before and during an event on Clima`.

### Task V4: Meteogram

**Files:**

- Create: `src/features/stats/WeatherMeteogram.tsx`, `src/features/stats/meteogramData.ts`, `src/features/stats/meteogramData.test.ts`
- Modify: `src/features/stats/WeatherTab.tsx` (`WeatherEvent` calls `useArrivalsStats(orgId, query)`), `src/lib/i18n.tsx`
- Test: `src/features/stats/WeatherTab.test.tsx`

**Interfaces:**

- Consumes: `weatherIcon` (V1), `WeatherHourPublic[]`, `ArrivalBucketPublic[]`.
- Produces:
  - `meteogramDomain(hours): [number, number]` = `[hours[0].offset_minutes, last.offset_minutes + 60]`.
  - `arrivalsInDomain(curve, domain): ArrivalBucketPublic[]` keeps buckets with `domain[0] <= start_minute < domain[1]`.
  - `hourRows(hours, curve)`: per hour, its arrivals summed over the 4 buckets inside it (for the text table).
  - `WeatherMeteogram({ hours, arrivals }: { hours: WeatherHourPublic[]; arrivals: ArrivalBucketPublic[] | null })`; `null` arrivals means the query failed and shows a note.

- [ ] **Step 1: Failing tests:** `meteogramDomain` for a 22:00 start is `[-180, 360]` and for 22:30 `[-210, 390]`; `arrivalsInDomain` drops -240 and 390 for a `[-210, 390]` domain and keeps -210; `hourRows` sums 4 buckets per hour. Component tests: the text table rows (time, condition label, temperature, sensación, rain, arrivals) with exact cells; arrivals error shows the note and still renders the weather rows; arrivals loading shows a skeleton strip.
- [ ] **Step 2:** run, expect FAIL.
- [ ] **Step 3: Implement.** Three Recharts charts inside `ChartContainer`s sharing `syncId="meteogram"` and `xAxis` `type="number"` on `domain` with ticks every 60 minutes labeled by `formatTime` of the hour; icon row as plain absolutely positioned `<img alt>` per hour above the first strip (`motion-reduce` swaps to the static variant, or the icons are the static `line` set and animation is CSS-free; pick whichever the package provides and note it in a comment). Temperature: two `Line`s plus an `Area` for the gap; rain: `Bar` per hour with mm labels when > 0; arrivals: `Bar` per 15 minutes. `ReferenceLine x={0}` labeled "inicio" and `ReferenceArea` for `x < 0` across strips. `ChartTextTable` below. Check at 375px.
- [ ] **Step 4:** tests PASS.
- [ ] **Step 5:** Commit `feat: chart the weather of an event hour by hour against its arrivals`.

### Task V5: Verify, review, PR

- [ ] Remove i18n keys no longer used (`statsRainy`, `statsDryEvents`, `statsWithoutWeather`, `statsWithoutWeatherList`, notes) after a grep shows no users.
- [ ] `npm run check`, `npm run test:run`, `npm run build`, all clean.
- [ ] Look at `/stats` Clima for one event and all events at 375px and desktop against the local backend.
- [ ] Run `/code-review` on the branch; fix real findings.
- [ ] Push and open the PR, noting it depends on the backend PR. Do not merge.
