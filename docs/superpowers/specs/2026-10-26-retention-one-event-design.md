# Fidelidad for one event

## Intent

With one event selected, Fidelidad shows three loose numbers today, and
"Personas" repeats what Asistencia already says. The user wants to see two
things about that night's crowd, in a chart that looks striking and that
anyone can read at a glance:

1. What the crowd was made of: newcomers, people who had come a few times,
   regulars.
2. What happened afterwards: how many of them came back.

The user handed every design call to Claude ("libertad completa").

## Goals

- One chart that answers both questions for that night, readable by anyone.
- A second chart that shows how fast the crowd came back over the next events.
- Headline cards that add something Asistencia does not already show.
- Plain-language copy in English and Spanish, phones first (375px).

## Non-goals

- No change to Fidelidad with all events selected.
- No new comparison against the period for the new numbers, except the
  return rate, which already has one.

## Design (Claude's calls)

### Headline cards (one event)

- **Primera vez**: count and share of the crowd, unchanged.
- **Habitués**: people for whom that night was their 6th visit or later,
  with their share of the crowd. Replaces "Personas". 6 or more matches the
  top bucket of the period view's frequency chart.
- **Volvieron**: unchanged, with its comparison line.

### "El público de esa noche"

Every attendee is their Mazmo face (`GuestAvatar`, initials without a
photo), ringed in the colour of their row. The rows follow the period view's
frequency buckets: first time, second time, 3 to 5 visits, 6 or more. A bar
across the top shows the share of each row. Faces of people who came back
to a later event are vivid; the rest are faded and grey, with the ring kept.
Hovering a face, or tapping it on a phone, shows the name, the visit, how
long since their previous visit, and whether they came back. The faces pop
in with a short stagger, skipped under `prefers-reduced-motion`. A visually
hidden table lists each person (name, visit, time since the previous visit,
and whether they came back) for screen readers. The faces are not focusable:
a tab stop per person would bury the rest of the page on a big night.

### "¿Volvieron después?"

For the next up to 6 finalized events of the org after that night, the share
of that night's crowd that had come back to at least one of them by then.
Two lines: first-timers and those who already came. With no later event, a
short "no events after this one yet" message.

## Approaches considered

1. **Backend returns the crowd per person and the cumulative return counts**
   (picked). The backend already knows each attendee's visit number, previous
   visit, and total visits from the attendances CTE; the frontend only draws.
   Costs a new nested field in the retention response and more work in
   backend PR #24.
2. **Frontend derives it from existing endpoints.** It would need every
   guest's full attendance history, which no endpoint returns, and would fetch
   far more than it shows.
3. **Only aggregated buckets from the backend.** Smaller payload, but no names
   on hover and no faces, which is the point of the chart.

## API

`RetentionStatsPublic.night` is null for a period and, for one meetup:

- `guests`: every audience attendee: `guest_id`, `displayname`,
  `avatar_url` (Mazmo, null when unknown), `visit`
  (1 is their first time), `days_since_previous` (null on a first time,
  Buenos Aires days), `came_back` (attended any later finalized meetup).
  Ordered by visit, most first.
- `afterwards`: the next up to 6 finalized meetups after it, oldest first:
  `meetup_id`, `name`, `date`, `back` and `back_new` (how many of the
  night's attendees, and of its first-timers, had attended this meetup or an
  earlier one of the list).

## Left to the builder

Colors, dot size, exact spacing, and animation timing.
