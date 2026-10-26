# Organization Statistics, Phase 7 (Clima) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the weather during each meetup (Open-Meteo, free, no key) with a background worker, show it on the meetup page with an "Actualizar clima" button, and add the **Clima** stats tab.

**Architecture:** A `meetup_weather` table (one row per meetup); `app/services/weather.py` with an Open-Meteo client and the pure summary math; `app/jobs/weather_worker.py`, a long-running loop run as its own docker-compose service; inline fetch when a location is set on a weather-ready meetup; a refresh endpoint; `GET /stats/weather`. Velvet adds a weather card on the meetup page and `WeatherTab`.

**Tech Stack:** as phase 6, plus Recharts `ScatterChart`.

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md`, "Weather", "Clima", "Constraints".

## Global Constraints

- Phase 1-6 Global Constraints.
- **Table `meetup_weather`** (migration `0024_meetup_weather.py`): `meetup_id` UUID PK and FK to `meetups.id` with `ON DELETE CASCADE`; `avg_temperature` float; `avg_apparent_temperature` float; `total_precipitation_mm` float; `max_wind_kmh` float; `rained` bool; `hourly` JSON (the raw hourly arrays used); `fetched_at` timestamptz; `source` str (max 64, value `"open-meteo-historical-forecast"`). SQLModel `MeetupWeather`, 1:1 like `GuestMazmoProfile`.
- **Source:** `https://historical-forecast-api.open-meteo.com/v1/forecast` with `latitude`, `longitude`, `start_date`, `end_date` (UTC dates covering the window), `hourly=temperature_2m,apparent_temperature,precipitation,wind_speed_10m`, `timezone=UTC`, `wind_speed_unit=kmh`. Timeout 5s. Client `OpenMeteoClient` in `app/services/weather.py`, shaped like `MazmoClient`; errors -> `WeatherUnavailableError`.
- **Window:** `[Meetup.date, Meetup.date + 6h)`. Hours used: every hourly timestamp `t` with `floor_hour(start) <= t < start + 6h`. Summary: averages of temperature and apparent temperature (1 decimal), sum of precipitation (1 decimal), max wind (1 decimal), `rained = total_precipitation_mm >= 0.2`. Pure function `summarize_weather(hourly, start) -> WeatherSummary`, unit tested.
- **Weather-ready:** latitude and longitude set and `Meetup.date + 6h + 2h <= now` (UTC). Finalized or not does not matter. Pure function `is_weather_ready(meetup, now) -> bool`.
- **Worker:** `python -m app.jobs.weather_worker` loops forever: each run selects weather-ready meetups with no `meetup_weather` row (oldest first, at most 50 per run), fetches one by one (respecting a 1 request/second pace), upserts rows, logs failures with structlog and continues; then sleeps 30 minutes. Runs once immediately on start (catch-up). `--once` flag runs a single pass and exits (used by tests and by hand). Handles SIGTERM by finishing the current meetup and exiting 0. Idempotent: an existing row is never refetched by the worker.
- **Compose:** a `weather-worker` service in `docker-compose.yml`, same image as `app`, `command: python -m app.jobs.weather_worker`, same `DATABASE_URL`/`JWT_SIGNING_KEY` env and awslogs logging (stream `weather-worker`), `restart: always`, `depends_on: migrate: condition: service_completed_successfully`. Check `scripts/deploy.sh` and `.github/workflows/cd.yml` for anything that lists services or copies files and update it so the new service ships.
- **Location changes (phase 6 PATCH):** when the coordinates change or are cleared, delete the meetup's weather row (it no longer describes that place). After saving, if the meetup is weather-ready, fetch inline (5s timeout); any failure is logged and ignored, the PATCH still returns 200.
- **Refresh:** `POST /organizations/{org_id}/meetups/{meetup_id}/weather/refresh` (org admin): 409 when not weather-ready (message says why: no location, or the event ended less than 2 hours ago); 502 on provider failure; otherwise fetch, overwrite, return `MeetupWeatherPublic`.
- **Read:** `GET /organizations/{org_id}/meetups/{meetup_id}/weather` (any org member) -> `MeetupWeatherStatusPublic {status: "OK" | "NO_LOCATION" | "PENDING" | "NOT_FETCHED", weather: MeetupWeatherPublic | null, ready: bool}` (`PENDING` = has location but window not over + 2h; `NOT_FETCHED` = ready but no row yet).
- **Stats `GET /stats/weather`** (audience, finalized, scope as every tab):
  - One event: `event: MeetupWeatherStatusPublic` plus that event's `attended` and `no_show_rate` (from the attendance service, not recomputed).
  - Aggregate: `meetups: list[{meetup_id, name, date, attended, no_show_rate, avg_temperature, rained, total_precipitation_mm}]` (weather fields null without a row); `rainy` and `dry` groups `{events, avg_attended, no_show_rate}` (no-show rate pooled over the group's RSVPs); `temperature_bands` over `avg_temperature`: `BELOW_10`, `FROM_10_TO_15`, `FROM_15_TO_20`, `FROM_20_TO_25`, `FROM_25` (lower bound inclusive), each `{band, events, avg_attended, no_show_rate}`, always all five; `without_weather: int`.
  - No comparison block (`comparison_kind` and `comparison` null): the tab compares groups of events against each other instead. Document this in the schema docstring.
  - Reuse the attendance service's per-meetup rows for attended/no-show; do not write the counts again.

## Review Focus

1. **Open-Meteo down during a location save** -> the PATCH still succeeds; the worker picks it up later. Test in Task 3.
2. **Worker restarted mid-run, or two runs overlapping** (deploy while running) -> no duplicate rows (PK + upsert), no crash. Test in Task 2.
3. **A meetup moved to another address after its weather was fetched** -> the old row is deleted and refetched for the new place. Test in Task 3.
4. **Hourly data missing some hours** (provider gap, nulls in arrays) -> summary uses the hours present; all-null -> no row written, logged. Test in Task 1.
5. **Meetups without weather in the aggregate** -> excluded from rainy/dry and bands, counted in `without_weather`, listed as "Sin dato" in velvet. Tests in Task 4 and Task 6.

---

## Part A: Backend

### Task 1: Weather table, client and summary math

**Files:** `app/models/models.py` (`MeetupWeather`), `alembic/versions/0024_meetup_weather.py`, `app/services/weather.py`; tests `tests/test_weather.py`.

- [ ] **Step 1: Failing tests:** `summarize_weather` with 8 hourly points around a 22:30 UTC start (exact averages, sum, max, `rained` true at 0.2 and false at 0.1); nulls inside arrays skipped; all-null -> `None`; `is_weather_ready` edges (no coords; exactly 8h after start -> ready; 7h59m -> not); client builds the exact query params (patch `httpx.AsyncClient.get`) and maps timeout/5xx to `WeatherUnavailableError`; `fetch_and_store_weather(session, meetup, client)` upserts (second call overwrites, one row).
- [ ] **Step 2:** fail. **Step 3:** implement + migration (prove downgrade/upgrade on the dev DB). **Step 4:** pass. **Step 5: Commit** `feat: fetch and store the weather of a meetup`

### Task 2: Weather worker and compose service

**Files:** create `app/jobs/__init__.py`, `app/jobs/weather_worker.py`; modify `docker-compose.yml`, and deploy/CD files if they need it; tests `tests/test_weather_worker.py`.

- [ ] **Step 1: Failing tests:** `run_once(session_factory, client, now)` fetches only ready meetups without a row, oldest first, capped at 50; a provider failure on one meetup is logged and the others still run; running twice writes no duplicates; SIGTERM handling sets a stop flag checked between meetups (test the flag function, not real signals).
- [ ] **Step 2:** fail. **Step 3:** implement (`main()` parses `--once`, builds the engine from settings like `scripts/seed_admin.py`, loops with `time.sleep` in short slices so SIGTERM is responsive). **Step 4:** pass; `docker compose config` validates. **Step 5: Commit** `feat: run a weather worker as its own service`

### Task 3: Inline fetch on location change, refresh and read endpoints

**Files:** `app/routers/meetups.py` (PATCH location side effects, refresh and read routes), schemas, examples, `openapi.json`; tests `tests/test_meetup_weather.py`.

- [ ] Tests: location set on a ready meetup fetches inline (row exists after the PATCH); provider failure still returns 200 and leaves no row; moving the location deletes the old row then refetches; clearing deletes it; refresh 409 (no location / too early, exact messages), 502, 200 overwrite; read endpoint statuses for each case; 403 staff for refresh, 200 staff for read. Full gate. **Commit** `feat: refresh and read the weather of a meetup`

### Task 4: Weather stats endpoint

**Files:** `app/services/stats/weather.py`, schemas, `app/routers/stats.py`, examples, `openapi.json`; tests `tests/test_stats_weather.py`.

- [ ] Tests (exact values): rainy vs dry groups with pooled no-show; temperature bands at the edges (10.0 -> `FROM_10_TO_15`); meetups without weather counted and excluded; one-event mode returns the status object; 401/403/404/422/empty. Full gate. **Commit** `feat: add the org weather stats endpoint`

---

## Part B: Velvet

### Task 5: Weather on the meetup page

**Files:** generated types; `queryKeys.ts` (`meetupWeatherKey`); `src/hooks/useMeetupWeather.ts`, `useRefreshMeetupWeather`; `src/features/meetups/MeetupWeather.tsx` (+ test); the meetup detail page; i18n. The location mutation from phase 6 also invalidates `meetupWeatherKey`.

- Card shows temperature, feels like, rain (mm, "Llovió" / "No llovió"), max wind; or the status reason: `NO_LOCATION` "Cargá la ubicación para ver el clima", `PENDING` "El clima se carga 2 horas después de que termina el evento", `NOT_FETCHED` "Todavía no se cargó el clima". Org admins get "Actualizar clima" when `ready`; it shows a spinner, then a toast; errors show the backend message.
- i18n keys (en / es) for every string above plus labels: `weatherTitle` "Weather" / "Clima"; `weatherTemp` "Temperature" / "Temperatura"; `weatherFeelsLike` "Feels like" / "Sensación térmica"; `weatherRain` "Rain" / "Lluvia"; `weatherRained` "It rained" / "Llovió"; `weatherDry` "No rain" / "No llovió"; `weatherWind` "Max wind" / "Viento máximo"; `weatherRefresh` "Update weather" / "Actualizar clima"; `weatherRefreshed` "Weather updated" / "Clima actualizado"; `weatherNoLocation`, `weatherPending`, `weatherNotFetched` (texts above; en: "Set the location to see the weather", "The weather loads 2 hours after the event ends", "The weather has not loaded yet"); `weatherSource` "Data: Open-Meteo, the 6 hours from the start" / "Datos: Open-Meteo, las 6 horas desde el inicio" shown as a `StatsNote`-style note.
- [ ] Tests for each status, the refresh button visibility (admin + ready only), refresh success and error. Gates. **Commit** `feat: show the weather on the meetup page`

### Task 6: Clima tab

**Files:** `statsWeatherKey`; `src/hooks/useWeatherStats.ts`; `src/features/stats/WeatherTab.tsx` (+ test); `StatsPage.tsx`, `useStatsFilters.ts` (`"weather"`), i18n.

- Aggregate: headlines "Con lluvia" vs "Sin lluvia" (avg attended each, no-show rate each, n = events), "Sin dato" count; temperature bands bar chart (avg attended per band, events as tooltip); scatter chart attendance vs average temperature (one point per meetup with weather, tooltip name + date); list of meetups without weather linking to their meetup page.
- One event: the same card content as the meetup page (reuse `MeetupWeather`'s presentational part), plus the event's attended and no-show.
- Notes (`StatsNote`): `statsNoteWeather` en "Weather from Open-Meteo for the 6 hours after each event's start, at the event's address. Events without a location or without weather yet are left out of the comparisons." / es "Clima de Open-Meteo para las 6 horas desde el inicio de cada evento, en su dirección. Los eventos sin ubicación o sin clima todavía quedan fuera de las comparaciones."; `statsNoteWeatherSample` en "With few events per group, differences can be chance." / es "Con pocos eventos por grupo, las diferencias pueden ser casualidad.".
- Other i18n: `statsTabWeather` "Weather" / "Clima"; `statsRainy` "Rainy" / "Con lluvia"; `statsDryEvents` "Dry" / "Sin lluvia"; `statsTempBands` "Attendance by temperature" / "Asistencia según temperatura"; `statsTempVsAttendance` "Attendance and temperature" / "Asistencia y temperatura"; `statsWithoutWeather` "Without weather" / "Sin clima"; band labels "< 10°", "10-15°", "15-20°", "20-25°", "25°+".
- [ ] Tests: loading, error, empty; exact headline values; bands; without-weather list; one-event status texts; notes; query params. Gates. **Commit** `feat: add the Clima stats tab`

### Task 7: Gate, demo data and browser check

- [ ] Run the worker once against the demo DB (`python -m app.jobs.weather_worker --once` with the demo `DATABASE_URL`) after setting locations on a few demo meetups through the UI, then browser-check the meetup weather card and the Clima tab at 375px and 1280px, light and dark. All gates in both repos.
