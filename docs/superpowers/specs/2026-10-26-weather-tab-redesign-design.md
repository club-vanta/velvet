# Weather tab redesign

## Intent

The Clima stats tab repeats what other tabs already show. For one event it shows attended and no-show counts (already on Asistencia) and the weather summary (already on the event page). For all events, the "Con lluvia / Sin lluvia" cards show a bare number (average attended per event) that nobody can read, built from 1 rainy event against 3 dry ones.

The user wants the tab to answer a new question: did the weather keep people from coming? The weather before the start matters most, because that is when people decide whether to go out. Rain from 19:00 to 21:30 at a 22:00 event is invisible today, because the stored window starts at 22:00, so the night counts as dry.

## Goals

- **One event:** a meteogram of 3 hours before the start through 6 hours after, with a line-style Meteocons icon per hour, temperature against apparent temperature, rain per hour, and arrivals per 15 minutes, all on one shared time axis. Above it, two summary cards: "Antes del inicio" and "Durante".
- **All events:** only "Asistencia según temperatura" (bands bar chart) and "Asistencia y temperatura" (scatter) remain, each with an "Antes / Durante" toggle that picks which temperature it uses.
- **Backend:** the weather window grows to 3 hours before the start, stores the before and during summaries separately, also fetches `weather_code` and `is_day`, and every stored meetup is fetched again.

## Non-goals

- Comparing an event against other events (rankings or percentiles). The user dropped it.
- Wind in the meteogram. It stays stored and on the event page, but the tab does not show it.
- Any change to the meetup page weather (`MeetupWeather`, `WeatherDetails`): it keeps showing the during window.
- Any change to the arrivals endpoint or the Horarios tab.

## Anti-goals

- A tab that again repeats numbers visible elsewhere. No attended or no-show headline cards here.
- Numbers without a unit or a label that says what they measure.
- A chart unreadable at 375px. This is why the meteogram uses stacked strips instead of one chart with three scales.

## Approaches

1. **Backend returns the hourly weather; velvet joins the arrivals (chosen).** The single-event weather stats response gains the hourly series. Velvet gets the arrival curve from the existing `useArrivalsStats` hook with the same scope, so no new arrivals code. Two requests, but each piece of data has one source, and the arrivals query is often cached from Horarios.
2. **Backend returns one merged timeline.** One request and a dumb client, but arrival bucketing would live in two backend services that can drift apart.

The user picked 1.

Meteogram layout: stacked strips (picked) against one combined chart with three scales (rejected: unreadable on phones). Icon style: Meteocons line (picked) against fill.

## Design

### Backend (`alter-tracker-backend`, branch from `main`)

**Fetch window.** `[floor_hour(start) - 3h, start + 6h)`. The Open-Meteo request adds `weather_code` and `is_day` to `hourly`. `start_date`/`end_date` still cover every UTC date the window touches.

- **Before:** hours `t` with `floor_hour(start) - 3h <= t < floor_hour(start)`. Exactly 3 hours.
- **During:** unchanged, `floor_hour(start) <= t < start + 6h`.

**Summaries.** `summarize_weather` computes the during summary as today and a before summary with the same rules (averages of temperature and apparent temperature, sum of precipitation, rained at >= 0.2 mm, nulls skipped per series). A row is still never written when every series is empty in both windows.

**Model (`MeetupWeather`), new migration.** Add nullable `before_avg_temperature`, `before_avg_apparent_temperature`, `before_total_precipitation_mm`, `before_rained`. `hourly` keeps the whole 9-hour window, now with `weather_code` and `is_day`. The existing columns keep their meaning (during), so `MeetupWeatherPublic` and the meetup page do not change.

**Refetch of stored rows.** Every existing row was fetched with the old window and lacks the before data. They must be fetched again by the existing worker at its 1 request per second pace.

**Stats API (`WeatherStatsPublic`).**

- `event` (one meetup): `WeatherEventPublic` replaces `attended` and `no_show_rate` with:
  - `before: WeatherWindowPublic | null`, where `WeatherWindowPublic` is `avg_temperature`, `avg_apparent_temperature`, `total_precipitation_mm`, `rained` (all nullable). The during summary is the existing `weather` field, so no `during` field duplicates it.
  - `hours: list[WeatherHourPublic]`, ordered by time: `time` (UTC ISO), `offset_minutes` (minutes from the meetup start to the hour's start, negative before; the hour containing a 22:30 start is -30), `temperature`, `apparent_temperature`, `precipitation_mm`, `weather_code`, `is_day` (all nullable except `time` and `offset_minutes`).
  - `status`, `weather` and `ready` stay.
- All events: remove `rainy`, `dry` and `without_weather` (and `WeatherGroupPublic` if nothing else uses it). `meetups` rows gain `before_avg_temperature`. Add `temperature_bands_before` next to `temperature_bands` (same band rules, using the before average), so the toggle needs no extra request.
- Regenerate `openapi.json`, update `openapi_examples`.

**Tests.** Window boundaries for a start on the hour and at :30, a night crossing midnight (3 UTC dates possible), before and during summaries from one fetch, nulls in one window only, the stats response for one event (hours and offsets) and for all events (both band sets, `before_avg_temperature`), and the migration.

### Velvet (branch from `main`, after the backend is merged and deployed)

- `npm run generate:api`.
- Add the `@bybas/weather-icons` dependency (MIT, stable 2.x). Use the `production/line/all` SVGs. `@meteocons/svg` 0.1.0 comes from a proof-of-concept repo, so not that one.

**One event (`WeatherEvent`).**

- Remove the attended and no-show cards and the `WeatherDetails` card.
- Two summary cards in a row: "Antes del inicio · HH:MM a HH:MM" and "Durante · HH:MM a HH:MM", each showing rain (`4,1 mm de lluvia` or `Sin lluvia`), the average temperature, and "(se sentía X°)". A null summary shows a dash with a reachable explanation, not "Sin lluvia".
- The meteogram, from top to bottom, all sharing one x domain in minutes from the start. The domain follows the hours: from the first hour's `offset_minutes` to the last hour's `offset_minutes + 60`. For a 22:00 start that is -180 to +360; for a 22:30 start, -210 to +390.
  1. A row of icons, one per hour, mapped from `weather_code` + `is_day` to the icon name (a small `weatherIcon.ts` map from WMO codes, unit-tested). Animations are off under `prefers-reduced-motion`. Each icon has an accessible name from i18n ("Lluvia", "Despejado", ...).
  2. Temperature (solid line) and apparent temperature (dashed line), with the gap between them shaded.
  3. Rain per hour (bars, mm labels on bars with rain).
  4. Arrivals per 15 minutes from `useArrivalsStats(...).curve` with the same scope, clipped to the domain.
  - A dashed vertical line at 0 labeled "inicio", and the before part shaded.
  - X labels are local clock hours, like the Horarios clock view.
  - Recharts strips with a shared `syncId` so hovering one hour highlights it in all three.
  - A `ChartTextTable` alternative with one row per hour: time, icon label, temperature, apparent temperature, rain, arrivals in that hour.
- Loading, error, and empty states for both queries. The arrivals query failing still shows the weather strips, with a note in place of the arrivals strip.

**All events (`WeatherAggregate`).**

- Keep only the two charts. Remove the rainy and dry cards, the without-weather card, `WithoutWeatherList`, and notes that only explained the removed parts.
- One "Antes / Durante" toggle above the two charts, using the shared `ViewToggle`, default "Durante". Both charts follow it: bands from `temperature_bands_before` or `temperature_bands`, scatter from `before_avg_temperature` or `avg_temperature`. The choice lives in the URL (`?weather_window=before`, absent or unknown means during), like `arrivals_view`.

**i18n.** Every new string in English and Spanish. Delete the keys of removed parts.

**Tests.** The icon map, both summary cards including null windows, the meteogram text table rows (exact values), the arrivals clipping, the toggle switching both charts and reading the URL, the loading/error/empty states, and that the removed cards are gone. Fixtures satisfy the full generated types.

## Rollout

One backend PR that adds and removes fields together, then velvet. The live Clima tab may break for the minute between the two deploys; the user accepted that (deploys take under a minute and nobody uses the app these days).

## Calls made by Claude (user can override)

- Before window is exactly the 3 whole hours before the start hour, so a 22:30 start uses 19:00 to 22:00 as before and 22:00 onward as during, matching today's during rule.
- The toggle default is "Durante", so the charts look the same as today until someone switches.
- Rainy, dry and without-weather fields leave the API too, not just the UI, so no dead contract stays behind.
- The summary cards show temperature and rain, not wind.
- `@bybas/weather-icons` (stable) over `@meteocons/svg` (proof of concept).

- The meteogram domain follows the stored hours, so a start at :30 shows whole hours with the start line inside one.

## Left to the builder

- How stored rows get refetched (delete them in the migration, or mark them stale and let the worker replace them while the old data stays visible).
- The exact WMO code to icon mapping and its Spanish labels.
- Strip heights and how the icon row scales at 375px (fewer icons or smaller ones).
