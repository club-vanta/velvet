# Guest meetup attendance on the profile: Design Spec

**Date:** 2026-10-23

## Intent

When staff open a guest's profile, they should see which meetups of the
active organization that person signed up for, and whether they went. The
goal is to spot people who keep signing up and not showing up. Today there
is no way to see this short of opening every meetup.

Org-wide event statistics (for example, a ranking of repeat no-shows) are a
future feature, not part of this one. This spec only covers the per-guest
view.

## Goals

- A **Meetups** section on the guest profile, below **Historial de nombres**,
  with the same timeline style.
- One row per meetup of the active org where the guest has an RSVP row
  (signed up through Mazmo, or added at the door as a walk-in).
- A one-line summary of that guest's totals above the timeline (mockup
  option B).

## Non-goals

- Org-wide attendance statistics or a no-show filter on `/guests`.
- Meetups from other organizations. Guests are global, meetups are not.
- Fixing meetups where the door did not use the app. Everyone who signed up
  will show as "No fue" there; the user knows and accepts this.

## Status rule (backend)

The database stores no "went / did not go" value, only separate flags on
the RSVP and the meetup. The backend turns them into one status, checked
in this order:

| Condition                            | Status      | Label (es) | Label (en) |
| ------------------------------------ | ----------- | ---------- | ---------- |
| `has_arrived` and `is_walkin`        | `WALKIN`    | Discreto   | Walk-in    |
| `has_arrived`                        | `ATTENDED`  | Fue        | Attended   |
| `cancelled_rsvp`                     | `CANCELLED` | Se bajó    | Cancelled  |
| `meetup.is_finalized`                | `NO_SHOW`   | No fue     | No-show    |
| otherwise (meetup not finalized yet) | `UPCOMING`  | Próximo    | Upcoming   |

- `has_arrived` wins over `cancelled_rsvp`: someone who cancelled on Mazmo
  but showed up anyway went.
- "No fue" only exists once the meetup is finalized. The user confirmed the
  org always finalizes meetups after each event, so the night of the event
  nobody is marked as a no-show yet.
- A walk-in counts as attended in the totals.
- A cancellation is not a no-show: telling the org you will not come is not
  the behavior this feature looks for.

The rule lives in the backend so the future statistics feature reuses it
instead of re-implementing it (decided with the user).

## Approaches

1. **New endpoint, status computed in the backend.** Chosen.
2. **New endpoint returning raw flags, status computed in velvet.** Same
   screen, but the no-show rule would live in the frontend and the future
   statistics feature would have to duplicate it. Rejected by the user:
   "ese tipo de cosas van en el backend".
3. **Existing endpoints only.** One request per meetup of the org, each
   returning its whole guest list. Rejected: slow and heavy.
4. **The event log.** It has check-ins and walk-ins but not sign-ups, so it
   cannot show no-shows. Rejected.

## Backend (alter-tracker-backend)

`GET /organizations/{org_id}/guests/{guest_id}/meetups`

- Permission: `get_org_member` (any org role, or site admin), same as the
  other org-scoped reads.
- 404 when the guest does not exist. A guest with no RSVPs in the org gets
  `200` with an empty list.
- Not paginated: a guest has at most a few dozen meetups in one org.
- Newest meetup first (`meetup.date` descending).

Response shape:

```jsonc
{
  "total": 6,
  "summary": {
    "attended": 2, // includes walk-ins
    "walkin": 1, // subset of attended
    "no_show": 2,
    "cancelled": 1,
    "upcoming": 1,
  },
  "meetups": [
    {
      "meetup_id": "uuid",
      "name": "Noche de Cuerdas",
      "date": "2026-10-11T23:00:00Z",
      "status": "NO_SHOW",
      "rsvp_time": "2026-10-02T15:12:00Z",
      "arrival_time": null,
      "guest_type": "NORMAL",
    },
  ],
}
```

- `status` is a new `StrEnum` in `app/models/models.py` (Python only, not a
  Postgres enum, same as `GuestType`). The rule is a pure function so it is
  unit-testable without a database and reusable by the future statistics.
- `rsvp_time` for a walk-in is when staff added them; the frontend shows
  "Sin anotarse" instead of a sign-up date for `WALKIN`.
- Follows the repo's router, schema, and OpenAPI examples conventions,
  with tests for each status, the summary counts, org scoping (RSVPs in
  another org never appear), 403 for non-members, and 404 for an unknown
  guest. `openapi.json` is regenerated in the same PR.

## Frontend (velvet)

- After the backend PR merges, `npm run generate:api` pulls the new types
  from the backend's `main`.
- New `GuestMeetups` section in `GuestProfile.tsx`, next to `NameHistory`,
  reusing its timeline markup (dot, name, badges, meta line), loading
  skeleton, error with retry, and empty state.
- Each row: meetup name linking to `/meetups/:id`, a status badge, a
  `guest_type` badge when it is not `NORMAL` (reusing the existing guest
  type labels), and a meta line with the meetup date, the sign-up date, and
  the arrival time when present.
- Dot style per status, as in the approved mockup: filled for
  attended/walk-in, red outline for no-show, gray outline for cancelled,
  faint outline for upcoming (a dashed border does not read on a 10px dot).
  The "No fue" badge is red.
- Summary line above the timeline, label then count, so Spanish verbs never
  need plural forms: "Fue 2 (Discreto: 1) · No fue 2 · Se bajó 1 · Próximo 1".
- Works in both places `GuestProfile` renders: the `/guests/:guestId` page
  and the side sheet on the meetup page, both of which already pass `orgId`.
- Query key `guestMeetupsKey(orgId, guestId)` in `src/lib/queryKeys.ts`,
  under an org prefix (`guestMeetupsOrgKey(orgId)`) that RSVP mutations
  invalidate as a whole.
- The timeline markup, section title, skeleton, and error-with-retry move to
  `ProfileSection.tsx`, shared by `NameHistory` and `GuestMeetups`.
- English and Spanish strings in `src/lib/i18n.tsx`; "Discreto" reuses the
  existing `walkinLabel` key.

## Calls made by Claude (not discussed with the user)

- Zero counts are hidden in the summary line.
- Empty state text: "No se anotó a ningún meetup de esta organización."
- `UPCOMING` is used for every non-finalized meetup, including the night of
  the event.
- Check-in, undo, walk-in, and finalize mutations on the meetup page
  invalidate the guest meetups query, so the side sheet stays current.

## Delivery

Two PRs, in order: backend first (merged to `main` so velvet can generate
types from it), then velvet. Each goes through CI and review before merging.
