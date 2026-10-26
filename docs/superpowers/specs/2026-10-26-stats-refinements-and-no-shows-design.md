# Stats refinements and the "No vinieron" tab

Date: 2026-10-26. Follow-up change requests on velvet #31 and backend #20,
from a review of the demo environment. The user approved the outline in
conversation and delegated the remaining calls ("confío en tu criterio").

## Intent

The user browsed the demo and found labels that do not say what they measure,
a layout that wastes space or looks unaligned, and a demographics comparison
that is hard to read. They also want a full analysis of people who sign up
and do not come: both the patterns and the people.

## Goals

1. **Meetup header**
   - Action buttons: one consistent row that wraps cleanly. Centered on
     phones, start-aligned from `@md`.
   - The address search shows only when the meetup has no location. With a
     location, admins get "Cambiar ubicación", which opens the same search
     with a cancel action.
   - The Mazmo link reads "Ir al evento en Mazmo" (external-link icon)
     instead of the raw URL.
2. **Wording**: in Spanish stats copy, "No-show" becomes "No vinieron" or "no
   vino". English keeps "No-show".
3. **Horarios**: each headline says what it measures, in plain words. The
   main value is a 24-hour clock time and the subline is the time relative
   to the start ("1 h 22 min después del inicio", never "+1:22"). Cards:
   - Hora promedio de llegada (mean arrival)
   - Franja con más llegadas (busiest local quarter hour)
   - El 90 % llegó antes de (p90)
   - Llegó en la primera hora (share in the first 60 min)

   Clock times are now available with several events too: each arrival's
   clock minute is counted from local midnight of its meetup's local date,
   so arrivals after midnight average correctly.

4. **Demografía**: only the people who came. The "Se esperaban" series and
   the no-show columns move to the new tab.
5. **New tab "No vinieron"** (`?tab=no-shows`, right after Asistencia):
   - Headlines: % that did not come, how many did not come, and how many
     people missed 2 or more times.
   - Rate per event (period mode only).
   - Rate by gender, by age, by sign-up lead time, by visit history (first
     time vs. had come before). Rain is left to the Clima tab, which already
     shows the no-show rate of rainy and dry events; a note points there.
   - The people list:
     - Period mode lists guests with 2+ no-shows in the period.
     - One-event mode lists everyone who missed that event, with their
       all-time counts.
     - Each row shows times signed up (not cancelled), came, did not come,
       and the last time they missed, and links to the guest page.
     - Sorted by most no-shows. First 50 plus the total, like the lapsed
       regulars list.

## Non-goals

- No actions from the list (ban, message). It only links to the guest page.
- No change to how a no-show is defined. It stays `attendance_status_expr`:
  an audience RSVP of a finalized meetup, not cancelled, never checked in.

## Approaches considered

- **Patterns only.** Rejected: the user wants to know who.
- **People list inside Asistencia.** Rejected: the user asked for its own tab,
  and Asistencia is already long.
- **New endpoint `GET /stats/no-shows` that reuses the existing pieces
  (chosen):**
  - the demographics counts;
  - the attendance rows;
  - the arrivals lead-time rows;
  - the weather grouping.

  It follows the one-endpoint-per-tab pattern, and the tab fetches only
  while active.

## Decisions (my calls, delegated)

- **Repeat threshold:** 2 or more no-shows in the period.
- **"First time":** the guest has no attendance (ATTENDED or WALKIN) at an
  earlier finalized meetup of the org, any date. This is the same notion as
  "new" in Retention.
- **Demographics contract:** groups drop `expected`, `no_show`,
  `no_show_rate` and `expected_share`. The PR is unmerged, so the contract
  can still change.
- **Arrivals contract:**
  - Median fields are replaced by mean fields (`mean_minutes`,
    `mean_local_time`). The user asked for the average.
  - `p90_local_time` and the new `peak_local_time` are filled in both modes.
  - With several events, the clock values and the offsets are computed
    separately. A note explains that they can differ when events start at
    different hours.
- **Horarios lead-time table:** keeps its no-show column (renamed), and the
  new tab shows the same rows as a chart. Duplication is acceptable there.

## Builder notes

- Backend first: regenerate `openapi.json`, then regenerate velvet types
  from a snapshot of the branch.
- Every user string in en and es. Check at 375px and 1280px, light and dark.

## Look and motion (added on request)

The user asked for a new palette and a more polished look, with animation.

- **Chart palette** ("velvet"), in fixed slot order: rose, cobalt, amber,
  amethyst, teal. It replaces the stock `--chart-*` tokens, which only the
  stats charts use. Light and dark steps were validated with the dataviz
  palette checker against each mode's card surface: lightness band, chroma,
  colorblind separation of neighbors, normal-vision separation, and 3:1
  contrast.
- **Entity colors**: attended is slot 1. "No vinieron" is slot 2 everywhere,
  including the whole no-show tab. Cancelled is slot 3.
- **Bar marks**: the data end is rounded at 4px, and a 2px card-colored gap
  separates stacked segments.
- **Motion**: one entrance per tab, where the headline cards rise in
  staggered. The rate bars grow from the left. The selected-tab card slides
  between tabs. Changing a location opens the search with a short fade. All
  motion respects `prefers-reduced-motion`.
- **Typography**: headline and card labels are sentence case, not tracked
  caps, because the new labels are phrases.
- **Rate bars**: the no-show breakdowns are real tables whose rate cells
  carry a bar, not recharts, so they read well at 375px and need no hidden
  text table.
- **Guest dots**: each guest shows one dot per sign-up, filled when they
  did not come and hollow when they came.
