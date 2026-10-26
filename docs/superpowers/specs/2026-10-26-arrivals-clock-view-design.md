# Arrivals chart by clock time

## Intent

On Horarios, "Llegadas cada 15 minutos" shows clock times (20:15, 20:45…) for one event, but minutes from the start (-0:45, 0:15…) for several events. The user wants to pick which one to see, like the Tasa / Composición switch, with clock time as the default.

## Goals

- A "Hora / Desde el inicio" selector above the chart, for one event and for several.
- "Hora" is the default, also for several events: arrivals summed per local quarter hour across the meetups in scope.
- The choice lives in the URL (`?arrivals_view=offset`; absent or unknown means clock).

## Non-goals

- The headline cards do not change: they already show the clock time with the offset below.
- The lead-time chart does not change.

## Approach

Only one is workable. The client receives arrivals already bucketed by offset from each meetup's start, and meetups start at different hours, so it cannot rebuild a clock-time histogram. The backend already computes every arrival's clock minute (minutes from the local midnight that starts the meetup's night, past 1440 after midnight) for `peak_local_time`, so it can bucket those too.

## Design

### Backend (`alter-tracker-backend`, branch from `main`)

- `ArrivalStatsPublic` gains `clock_curve: list[ClockBucketPublic]`.
- `ClockBucketPublic`: `start_minute: int` (minutes from the local midnight starting the night, so 00:15 after midnight is 1455), `local_time: str` ("HH:MM"), `arrivals: int`.
- Same arrivals as `curve` (the 120 min before to 720 min after window), bucketed by `floor(clock_minute / 15) * 15`, with the empty buckets between the first and last filled in, ordered by `start_minute` so a night crossing midnight stays in order.
- For one meetup it matches `curve` shifted to the clock.
- Tests: several meetups starting at different hours land in the right clock buckets, after-midnight arrivals sort after 23:45, empty scope gives an empty list, gaps are filled. Regenerate `openapi.json`.

### Velvet (branch from `main`, after the backend is merged and deployed)

- `npm run generate:api`.
- A two-button toggle like the No vinieron one: "Hora" / "Desde el inicio" (en "Clock time" / "From start"), above the chart, for every scope. Extract the toggle used on No vinieron into a shared `ViewToggle` in `src/features/stats/` so both tabs use one component.
- Clock view: bars from `clock_curve`, x labels `local_time`, axis caption "Hora de llegada" (en "Arrival time"). Its text-table alternative lists the same rows.
- Offset view: today's chart from `curve` with its "Horas desde el inicio del evento" caption, for one event too (labels as offsets).

## Calls made by Claude (user can override)

- In offset view, one event shows offsets too (not clock labels), so the selector means the same thing in every scope.
- The No vinieron toggle is extracted and reused rather than copied.
- URL value names the non-default (`arrivals_view=offset`), like `noshow_view=share`.

## Left to the builder

- Tests: toggle default and switch, URL persistence and fallback, clock labels for several events, offset labels for one event in offset view.
- 375px check of the toggle above the chart.
