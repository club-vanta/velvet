# Organization statistics: Design Spec

**Date:** 2026-10-24

## Intent

Org owners and the site admin want to understand their events: who comes,
when they arrive, whether new people come back, and whether the weather
changes anything. Today velvet only has the live door cards on the meetup
page (check-ins, guest types, payments), which describe one event while it
is happening.

Nobody knows yet which numbers will turn out to be useful. The user wants
to measure **many** things and then keep the ones that help, so the design
favors breadth and cheap additions over polishing any single chart.

## Goals

- A new **Estadísticas** page in velvet, for both phone and desktop.
- Two levels: one event, and the aggregate of every event in a chosen
  period.
- A broad first catalog of metrics (below), delivered in phases.
- A location on each meetup, entered with address autocomplete, and the
  weather during each event, fetched automatically.

## Non-goals

- A BI tool (Metabase, Superset). Considered and rejected, see Approaches.
- Statistics for STAFF users. They work the door and do not see the page.
- Precomputed or cached results. Everything is computed per request (see
  Constraints).
- Reading the address from Mazmo. Mazmo shows it only after you sign up,
  and some organizers share it privately, so it is never reliable.
- Changing the live door cards on the meetup page (`MeetupStats.tsx`).

## Anti-goals

- Adding a metric must not mean touching many files in both repos. If it
  does, the structure is wrong.
- Numbers must not disagree with the rest of the app. Attendance status
  comes from `app/services/attendance.py`, never a second definition.
- The page must not be unusable on a 375px phone.

## Constraints

- Data size: about 1,100 guests, a few dozen meetups per org, thousands of
  RSVPs. Postgres aggregates this in milliseconds, so stats are computed on
  each request with SQL.
- 99% of guests are linked to Mazmo, so gender and age come from
  `GuestMazmoProfile`. Unlinked guests count as "Sin dato".
- `GuestMazmoProfile.age` is the age **today**, not at the event. The user
  accepts the drift (a few years at most).
- `gender` is free text controlled by Mazmo. Show the values as they come,
  with a fallback label for unknown ones.
- The backend has no job runner today. A separate background container
  is fine (confirmed by the user).
- Meetups store only a start (`Meetup.date`), no end time.
- Free services with no API key: Photon (komoot) for geocoding and
  Open-Meteo for weather. Both are public, fair-use instances.

## Approaches

1. **Everything inside velvet.** Chosen by the user. The backend exposes
   stats endpoints computed with SQL, and velvet renders them with the
   shadcn `chart` component (Recharts v3). Same auth, i18n, design, and
   phone support as the rest of the app. Cost: each metric is code plus a
   PR, kept cheap by the per-tab structure below.
2. **Metabase embedded** with a locked `org_id` in a signed JWT. Metrics
   take minutes and need no deploy, but it is another JVM service on a small
   EC2 instance, the UI is not velvet's, it is weak on phones, and tenant
   safety depends on never forgetting the filter. Rejected.
3. **Hybrid:** approach 1 for owners plus a local Metabase only for the
   site admin to explore. Offered as an optional extra and not taken up.

Page layout options (mocked up on a phone frame):

- **A. One page with two selectors** (period and event). Chosen.
- B. A stats tab inside each meetup plus a separate aggregate page.
- C. Period summary with a table of events that link to each event.

Geocoding options: Google Places (best street data, needs a key and
billing), Mapbox (free tier, needs a key), Photon (free, no key, uses
OpenStreetMap data). The user chose **Photon**: "usemos la gratis sin API
KEY, y veamos como funciona".

## Access

- Permission: `get_org_admin` (org `ADMIN` or `SITE_ADMIN`) for every stats
  endpoint and for setting a meetup's location.
- Velvet shows the **Estadísticas** nav entry only to those roles.
- A meetup's location (address and coordinates) is visible to **any org
  member**. The user: velvet is only used by organizers and staff, so the
  address is not sensitive.

## The page (velvet)

Route `/stats`. All filter state lives in the URL
(`/stats?range=3m&meetup=<id>&tab=attendance`), so links can be shared and
the back button works.

- **Header:** title, then two selectors on one row (wrapping on phones):
  - **Period:** last 30 days, last 3 months (default), last 12 months, this
    year, all time, custom range.
  - **Event:** "Todos los eventos" (the aggregate) or one finalized meetup
    from the selected period, newest first.
- **Tabs**, the same in both modes: **Asistencia**, **Horarios**,
  **Demografía**, **Fidelidad**, **Operación**, **Clima**. On phones the tab
  bar scrolls sideways.
- Each tab loads on its own (one request per tab), with its own skeleton,
  error with retry, and empty state ("No hay eventos finalizados en este
  período").
- **Comparison line under each headline number:**
  - Aggregate: change against the previous period of the same length
    ("+8% vs. período anterior").
  - Single event: against the org average for the selected period
    ("promedio: 82").
- Rates computed from fewer than 10 people are shown dimmed with the `n`
  visible, so small samples do not look authoritative.
- Charts use the shadcn `chart` component (Recharts v3), added with the
  shadcn CLI to `src/components/ui/chart.tsx`.

The word for the sign-up to attendance breakdown is **Asistencia**. The user
does not want "embudo".

## Which data counts

- **Finalized meetups only.** An open meetup has no no-shows yet and its
  numbers change while people arrive.
- **Period filter on `Meetup.date`**, local time, start inclusive, end
  exclusive.
- **Audience = guest types `NORMAL` and `INVITED`.** `STAFF` and `VENDOR`
  work the event and are not audience, so they are left out of every tab
  except **Operación**, which shows them.
- Attendance status per RSVP comes from `attendance_status()` in
  `app/services/attendance.py`. A walk-in never checked in has no status and
  is left out, as on the guest profile.
- Because SQL aggregates cannot call a Python function, `attendance.py`
  gains a SQLAlchemy `CASE` expression with the same rule, next to
  `attendance_status()`, plus a parity test that runs both over every flag
  combination. All stats queries use that expression; nobody writes the
  rule again.
- **Time zone:** `America/Argentina/Buenos_Aires` for every local-time
  bucket. All current orgs are in Argentina, which has one zone and no DST.

## Metric catalog

"Rate" means a percentage. Each item says what it shows in the aggregate
(**Agg**) and for one event (**Event**) when they differ.

### Asistencia

- Events in the period (Agg), signed up, cancelled, attended (walk-ins
  included), walk-ins, no-show.
- Cancellation rate = cancelled / signed up.
- No-show rate = no-show / (signed up − cancelled), walk-ins excluded.
- Average attended per event (Agg).
- Chart (Agg): one stacked bar per event (attended, no-show, cancelled) in
  date order. Chart (Event): one horizontal stacked bar of the same parts.

### Horarios

- Arrival curve in 15-minute buckets. Agg: minutes relative to each
  meetup's start, so events starting at different hours line up. Event:
  local clock time.
- Peak bucket, the time by which 50% and 90% of attendees had arrived, and
  the share that arrived in the first hour.
- Sign-up lead time: how many days before the event people signed up, in
  buckets (same day, 1, 2-3, 4-7, 8-14, 15+). Walk-ins excluded.
- No-show rate per lead-time bucket (do last-minute sign-ups flake more?).

### Demografía

- Gender distribution of attendees: Mazmo values as they come, with
  "Sin dato".
- Age distribution of attendees in buckets (18-24, 25-29, 30-34, 35-39,
  40-49, 50+, Sin dato), plus the median age.
- No-show rate by gender and by age bucket.
- Signed up vs. attended mix (does the attending crowd differ from the
  signed-up crowd?).

### Fidelidad

- A guest's **first time** is their first attended meetup in this org,
  ever (not just in the period).
- New vs. returning attendees, as counts and rates (Agg and Event).
- Return rate of first-timers: share of first-timers in the period who
  attended any later meetup of the org.
- Cohort table (Agg): one row per month of first attendance, one column
  per following month, cell = % of that cohort who attended in that month.
  On phones it scrolls sideways inside its card.
- Attendance frequency: attendees grouped by meetups attended in the
  period (1, 2, 3-5, 6+).
- Regulars who stopped coming: attended 3+ meetups before the period and
  none during it. Listed by name, linking to the guest profile.
- Event: of this event's first-timers, how many came back later.

### Operación

All guest types, including `STAFF` and `VENDOR`.

- Guest type mix.
- Payments, for meetups with `requires_payment`: paid, pending, exempt.
- Check-ins per staff user (`checked_in_by_id`).
- Busiest 15 minutes at the door (most check-ins).
- Bans issued in the period, from `event_log`.

### Clima

- Event: temperature, feels-like temperature, rain (mm) and max wind during
  the event window.
- Agg: no-show rate and average attendance, rainy vs. dry events, and by
  temperature band. A chart of attendance against temperature, one point
  per event.
- Meetups without weather (no location, or fetch not done) are listed as
  "Sin dato" and left out of the comparisons.

## Backend (alter-tracker-backend)

### Stats endpoints

One endpoint per tab, so tabs load independently and adding a section does
not touch the others:

```
GET /organizations/{org_id}/stats/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD[&meetup_id=]
GET /organizations/{org_id}/stats/arrivals?...
GET /organizations/{org_id}/stats/demographics?...
GET /organizations/{org_id}/stats/retention?...
GET /organizations/{org_id}/stats/operations?...
GET /organizations/{org_id}/stats/weather?...
```

- `from`, `to`: local dates, both optional. Leaving them out means "all
  time", which has no previous period. `meetup_id`: optional; when present
  the response describes that meetup and the comparison uses the period
  average. A `meetup_id` outside the org or not finalized is `404`.
- Each response carries its own comparison values (previous period, or
  period average), so velvet never computes statistics itself.
- New router `app/routers/stats.py`, schemas in `app/schemas/stats.py`, and
  one service module per tab under `app/services/stats/`, sharing a small
  helper for the period and audience filters. Follows the repo's router,
  schema, OpenAPI examples, and test conventions. `openapi.json` is
  regenerated in each PR.
- Tests per endpoint: the definitions above with exact values, org scoping,
  non-finalized meetups ignored, `STAFF`/`VENDOR` excluded where stated,
  403 for STAFF users and non-members, empty period.

### Meetup location

- New nullable columns on `Meetup`: `location_label` (the chosen address
  text), `latitude`, `longitude`. Alembic migration.
- `PATCH /organizations/{org_id}/meetups/{meetup_id}/location` (org admin),
  sets or clears all three together. Works on finalized meetups too, so past
  events can be filled in.
- `GET /organizations/{org_id}/geocode?q=...` (org admin) proxies Photon
  (`https://photon.komoot.io/api`) and returns a trimmed list of
  `{label, latitude, longitude}`. It biases results to Argentina
  (`countrycode=AR` plus a lat/lon bias near Buenos Aires) and caps results
  at 5. The proxy keeps the provider swappable and lets the backend
  rate-limit the public instance.
- Location is included in the meetup responses so any org member can see
  it.

### Weather

- New table `meetup_weather` (one row per meetup, `meetup_id` as PK like
  `GuestMazmoProfile`): summary columns (avg temperature, avg feels-like,
  total rain mm, max wind, `rained` boolean), the raw hourly values as JSON,
  `fetched_at`, and the source API.
- Source: Open-Meteo **Historical Forecast API**, which their docs recommend
  for the most accurate recent past conditions. Hourly
  `temperature_2m`, `apparent_temperature`, `precipitation`,
  `wind_speed_10m`.
- Event window: `Meetup.date` to 6 hours later (meetups have no end time).
- A meetup is **weather-ready** once it has a location and its window
  ended at least 2 hours ago. Before that, the data would be forecast, not
  what happened. Staff often finalize at the door, before the window ends,
  so finalizing never triggers a fetch.
- **Weather worker:** a new `weather-worker` service in
  `docker-compose.yml`, same image as the API, running
  `python -m app.jobs.weather_worker`. Every 30 minutes it fetches weather
  for weather-ready meetups that have no row yet. It is idempotent and
  picks up any backlog on start, which matters because the EC2 instance is
  on-demand and can be stopped. It runs as its own container, not inside
  the API, because uvicorn runs 2 workers and an in-process scheduler would
  run twice. The user confirmed a background container is fine. Failures
  are logged and retried on the next run, and those meetups show as
  "Sin dato" meanwhile. The weather stats endpoint stays a pure read.
- Setting a location on a meetup that is already weather-ready fetches
  inline with the same timeout. A failure never blocks saving the location.
- **"Actualizar clima"** (org admin) on the meetup page refetches and
  overwrites, always available when the meetup is weather-ready, so wrong
  values never get stuck.

## Velvet (frontend)

- Feature folder `src/features/stats/`: the page, the selector bar, one
  component per tab, and small shared pieces (headline number with
  comparison, chart card, "Sin dato" handling).
- One hook per tab in `src/hooks/`, query keys in `src/lib/queryKeys.ts`
  under an org stats prefix. Finalize, unfinalize, check-in, location, and
  weather mutations invalidate that prefix.
- Location field on the meetup page: shows the address, and for org admins
  an edit control with debounced autocomplete (300ms, 3+ characters)
  calling the geocode proxy.
- Every string in English and Spanish in `src/lib/i18n.tsx`.
- Reuse `ListToolbar`, `FactStrip`, and the `StatCard` look from
  `MeetupStats.tsx` where they fit, extracting shared pieces instead of
  copying them.
- Tests per tab: loading, error, empty, and populated states with exact
  values, plus the URL state (changing period or event updates the URL and
  the requests). The phone layout is tested with the `useMediaQuery` stub.

## Delivery

One phase per tab, each with its own plan. The user asked for a single
backend PR and a single velvet PR covering every phase; the backend PR is
merged first so velvet can regenerate its types.

1. **Foundation + Asistencia:** stats router, period and audience helpers,
   the attendance endpoint; velvet page, nav entry, selectors, URL state,
   tab shell, chart component, Asistencia tab.
2. **Horarios.**
3. **Demografía.**
4. **Fidelidad.**
5. **Operación.**
6. **Ubicación:** location columns, geocode proxy, location field on the
   meetup page.
7. **Clima:** weather table, Open-Meteo client, weather worker container
   (plus its compose and infra wiring), "Actualizar clima", Clima tab.

Tabs that are not built yet do not appear.

## Calls made by Claude (not discussed with the user)

- Default period: last 3 months.
- Audience (`NORMAL` + `INVITED`) applies to every tab except Operación,
  not only Demografía and Fidelidad as first discussed.
- Rates from fewer than 10 people are dimmed.
- Aggregate arrival curve is relative to each meetup's start; single event
  uses clock time.
- Fixed `America/Argentina/Buenos_Aires` time zone instead of a per-org or
  per-meetup setting.
- Weather window of 6 hours from start, and the Historical Forecast API
  over the ERA5 archive.
- Geocode and location edits are admin-only; viewing the location is open
  to any org member.
- Weather is fetched by a separate worker container every 30 minutes,
  for meetups whose window ended 2+ hours ago, instead of at finalize, plus
  an always-available "Actualizar clima" button.
- Attendance rule shared with SQL through a `CASE` expression in
  `attendance.py` with a parity test.
- "All time" has no previous period, so it shows no comparison.
- Earlier attendance as `STAFF` or `VENDOR` does not count as a guest's
  first time; only audience attendance does.

## Left to the builder

- Exact response shapes per endpoint and the SQL for each metric.
- Chart types beyond those named above, and colors (from the existing chart
  tokens).
- How the custom date range picker looks.
- Photon request details (language parameter support on the public
  instance, exact bias point and zoom).
