# Guest type, displayname history, and Mazmo profile (Frontend): Design Spec

**Date:** 2026-10-21

## Overview

Backend PR [club-vanta/alter-tracker-backend#16](https://github.com/club-vanta/alter-tracker-backend/pull/16)
ships three features in one branch:

1. **Guest type payment exemption**: a per-RSVP `guest_type`
   (`NORMAL` / `INVITED` / `VENDOR` / `STAFF`). Non-`NORMAL` guests skip the
   payment check-in gate. Org admins change it with
   `PATCH .../guests/{guest_id}/type`, and `GET .../meetups/{id}/stats`
   returns grouped counts.
2. **Displayname history**: every value a guest's displayname ever had, with
   its source (`SYNC`, `MANUAL_EDIT`, `MAZMO_LINK`, `BACKFILL`) and actor,
   via `GET /guests/{guest_id}/displayname-history`.
3. **Mazmo profile**: a snapshot of avatar, age, gender, pronoun, and
   Mazmo's own `suspended`/`banned` flags, exposed as
   `mazmo_profile` on `GuestPublic` and `GuestWithBanPublic`.

The Mazmo profile spec says the data exists so the frontend can build a page
to see a guest's information. This spec covers the frontend work for all
three features, including that page.

## Backend contract

| Endpoint                                                             | Method | Permission    | Notes                                                                                 |
| -------------------------------------------------------------------- | ------ | ------------- | ------------------------------------------------------------------------------------- |
| `/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type` | PATCH  | org admin     | Body `{ guest_type }`. 409 when the meetup is finalized. Returns `MeetupGuestPublic`. |
| `/organizations/{org_id}/meetups/{meetup_id}/stats`                  | GET    | org member    | `attendance`, `cancellations`, `guest_types`, `payment` groups.                       |
| `/guests/{guest_id}/displayname-history`                             | GET    | approved user | Newest first. Never empty for a guest created after migration 0018.                   |
| `/guests/{guest_id}`                                                 | GET    | approved user | Now includes `mazmo_profile`.                                                         |

Shape changes:

- `RsvpPublic.guest_type: string` (typed as `string`, not the enum, because
  the backend stores it as `VARCHAR`).
- `GuestPublic.mazmo_profile` and `GuestWithBanPublic.mazmo_profile`:
  `GuestMazmoProfilePublic | null`. `null` both for guests without Mazmo and
  for linked guests that no sync has reached yet.
- New `EventType` values: `GUEST_TYPE_CHANGED` (org-scoped) and
  `GUEST_DISPLAYNAME_CHANGED` (global, `org_id = null`).

Known backend limitation: the org-scoped audit log endpoints filter by
`org_id`, so global events (`GUEST_CREATED`, `GUEST_MAZMO_LINKED`,
`GUEST_DISPLAYNAME_CHANGED`, ...) never show up there. The displayname
history therefore lives on the guest profile, not in the audit log.

## Decisions

### Check-in gate mirrors the backend exactly

```ts
const isBlockedByPayment =
  !paymentStateKnown ||
  (requiresPayment && !isPaymentExempt(rsvp.guest_type) && !rsvp.has_paid);
```

`isPaymentExempt(t)` is `t !== "NORMAL"`, the same comparison the backend
gate uses. The frontend never invents a stricter or looser rule.

### Payment column for exempt guests

- Exempt and unpaid: an "Exempt" badge, no "Mark paid" button (marking an
  exempt guest as paid has no effect on check-in).
- Exempt and paid (someone who paid before being reclassified): "Exempt"
  plus "Paid", and admins keep "Undo payment" so a refund can be recorded.

### Changing a guest's type

A per-row actions menu (the `...` button already used on the Guests page)
holds "View profile" for everyone and a "Guest type" radio group for org
admins. Picking a value fires the PATCH right away: the change is audited,
reversible, and fast at the door, so a confirmation dialog would only slow
staff down. The radio group is disabled on finalized meetups, matching the
backend 409.

### Stats panel replaces the client-side progress bar

The old progress bar counted cancelled RSVPs in its total. The new panel
reads `GET .../stats`, which excludes them, and shows four cards:

- **Check-ins**: arrived out of total, progress bar, walk-in count.
- **Guest types**: normal, invited, vendor, staff.
- **Payment** (only on paid meetups): paid, pending, exempt.
- **Cancellations**: cancelled count, and how many of them paid, so staff
  know who to refund.

Every mutation that can change these numbers invalidates both
`["meetup-guests", orgId, meetupId]` and `["meetup-stats", orgId, meetupId]`
through one helper, so the two can never drift apart.

### Guest profile: one component, two containers

`GuestProfile` renders a guest's identity, Mazmo profile, org ban status, and
name history. It is shown:

- As a page at `/guests/:guestId`, linked from the Guests table and from the
  audit log, with edit / link / unlink / vant actions.
- Inside a side sheet on the meetup detail page, so door staff can check
  someone without losing their place in the list.

### Mazmo flags are never confused with our own ban

Mazmo's `suspended`/`banned` flags get their own amber "Suspended on Mazmo" /
"Banned on Mazmo" badges, visually distinct from the red "Vanted" badge, with
a tooltip that states they come from Mazmo. The profile repeats this in a
callout.

### The guest list becomes cards below `xl`

At the door, staff use phones and tablets. The table is about 1000px wide,
so next to the sidebar it needed a horizontal scroll to reach "Check in" on
anything narrower than `xl` (1280px). Below `xl` the list renders as one
card per guest: identity on top, status and payment below, and the check-in
button and actions menu pinned to the right. Both layouts share the same
cell renderers, and only one is mounted at a time (`useMediaQuery`) so ids
and accessible names never appear twice. The stats panel uses two columns
below `xl`.

### Finalized meetups say so

The header shows a "Finalized" badge, and check-in, walk-in, sync, and
"Mark paid" are disabled, matching the backend 409s. Undo check-in and undo
payment stay available, since the backend allows them as corrections.

### Stable row order

The API orders meetup guests by `rsvp_time` only. Guests with the same
`rsvp_time` could swap places after any refetch (for example right after
changing someone's type), so the client always sorts by `rsvp_time` and then
`guest.id`, also as the tie-breaker for every sortable column.

### Avatars

A shared `GuestAvatar` shows the Mazmo avatar with an initials fallback (no
avatar, or the image fails to load). Avatars appear in the meetup guest list,
the walk-in picker, the Guests table, and the profile. Row avatars are
decorative (`alt=""`) because the name sits right next to them.

Gender and pronoun are free text controlled by Mazmo, so they render as-is.
They only appear on the profile, never in table rows.

## Files affected

| File                                        | Why                                                          |
| ------------------------------------------- | ------------------------------------------------------------ |
| `src/api/types.ts`                          | Regenerated from the PR #16 `openapi.json`                   |
| `src/lib/guestType.ts`                      | Guest type list, exemption rule, labels                      |
| `src/lib/queryKeys.ts`                      | Shared query keys and the meetup invalidation helper         |
| `src/hooks/useMediaQuery.ts`                | Picks the table or the card list                             |
| `src/components/GuestAvatar.tsx`            | Avatar with initials fallback                                |
| `src/components/GuestBadges.tsx`            | Guest type and Mazmo flag badges                             |
| `src/features/meetups/MeetupStats.tsx`      | Stats panel                                                  |
| `src/features/meetups/GuestRowActions.tsx`  | Per-row menu with the guest type radio group                 |
| `src/features/meetups/MeetupDetailPage.tsx` | Gate, payment column, avatars, badges, sheet, stats          |
| `src/features/guests/GuestProfile.tsx`      | Shared profile view                                          |
| `src/features/guests/GuestDetailPage.tsx`   | `/guests/:guestId`                                           |
| `src/features/guests/GuestDialogs.tsx`      | Edit / link / unlink / vant dialogs, moved out of GuestsPage |
| `src/features/guests/useUnbanGuest.ts`      | Unvant mutation shared by the Vanted tab and the profile     |
| `src/features/guests/GuestsPage.tsx`        | Avatars, flags, links to the profile                         |
| `src/features/events/EventsPage.tsx`        | New event labels, filter, readable type-change reason        |
| `src/App.tsx`                               | New route                                                    |
| `src/lib/i18n.tsx`                          | New strings, `en` + `es`                                     |

## Out of scope

- Showing global guest events in the audit log (needs a backend change).
- Filtering the meetup guest list by type.
- A "refresh this guest from Mazmo now" action (no backend endpoint).
