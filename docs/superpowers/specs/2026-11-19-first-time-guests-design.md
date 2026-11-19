# First-time guests on the meetup page

## Why

Door staff want to know who has never come to an event of the org:

1. A few hours before the meetup, to see the list of newcomers ahead of time.
2. During the meetup, so whoever welcomes a guest at the door already knows
   they are new.

The post-event view (how many newcomers came) already lives in the stats
Fidelidad tab and is out of scope.

## Goals, non-goals, anti-goals

- Goal: a guest who is new is visible as new on their card and row, and staff
  can narrow the list to only the newcomers.
- Non-goal: a post-event summary, return rates, "second visit" labels.
- Anti-goal: a number that disagrees with the stats tab. "New" here must use
  the same rule as stats `FIRST_TIME`.
- Anti-goal: one request per guest, or any extra cost on a 1000+ guest list.

## Definition

A guest is new at meetup M when they have no attendance (arrived, not only
RSVP'd) at a finalized meetup of the same org that started strictly before M.
This is the stats `FIRST_TIME` rule (`attendances_cte` in the backend).

## Approaches considered

- **A. Badge, filter and counter in the existing list (picked).** A
  "✦ Primera vez" badge on the guest card and table row, a "Primera vez"
  filter in the guest list toolbar, and a "Nuevos" stat card that applies the
  filter when tapped. Reuses the filter, badge and stats infrastructure; adds
  no new screen.
- **B. A "Primera vez (N)" section above the list, plus the badge.** Visible
  without touching a filter, but duplicates guests on the page and adds more
  UI to maintain on phones. Not picked.
- **Frontend only, from the stats endpoints.** Rejected: the guest list does
  not carry the data, the stats night view only covers finalized meetups, and
  the project rule is to fix the contract at the source.

Mockups of A and B were compared in the browser; the user picked A.

## Design

### Backend (alter-tracker-backend, first PR)

- `MeetupGuestPublic` gets a required `prior_visits: int`: the number of
  finalized meetups of the org, started before this meetup, that the guest
  attended. `0` means first time.
- The guest list endpoint computes it for every guest with one aggregate query
  built on `attendances_cte`, not per guest. The single-guest endpoints that
  also return `MeetupGuestPublic` (check-in, payment and so on) compute it for
  that one guest with the same query, so the field is always correct.
- Tests: a guest with no history, a guest who only RSVP'd before (still new),
  a guest who attended a finalized earlier meetup (not new), attendance at a
  non-finalized or later meetup (does not count), another org's meetups (do
  not count).

### Velvet (second PR, after the backend deploys)

- `npm run generate:api` picks up `prior_visits`.
- `isFirstTime(guest)` in `src/domain/guest/` (or the meetups feature `lib/`
  if nothing else uses it).
- `FirstTimeBadge` next to the existing badges in `GuestIdentity`, so cards
  and table rows both show it. Amber, distinct from the type and Mazmo badges.
- `GuestFilters` gets `firstTimeOnly: boolean`, in the toolbar next to
  walk-in and banned, so it counts as an active filter and resets the same way.
- A "Nuevos" stat card in `MeetupStats`: the count of new guests with an
  active RSVP, plus how many of them already arrived. Computed from the guest
  list already loaded, no new request. Tapping it turns the filter on.
  Hidden when there are none.
- i18n in English and Spanish.
- Tests: Vitest for `isFirstTime` and the filter in `guestListView`; Cypress
  component tests for the badge, the stat card (zero, some, loading and error)
  and the filter; one E2E flow at 375px: tap "Nuevos", see only newcomers.

## Left to the builder

- Exact badge icon and copy, matched to the existing badge style.
- Where the stat card sits in the grid on desktop.
