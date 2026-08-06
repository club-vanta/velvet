# Paid Entrance Tracking — Design Spec

**Date:** 2026-08-06

## Overview

Club Vanta is starting to run paid events. Guests still RSVP on Mazmo as always,
but for these events they cannot physically enter unless they paid the entrance
fee beforehand. Payment itself happens outside the system (cash, transfer); an
org admin flips a boolean by hand once they confirm the guest paid.

The backend for this is already implemented, tested, and merged in
`alter-tracker-backend` (commits `2dfcdb7` and `4b10665`). This spec covers the
frontend only.

## Backend contract (already shipped)

Data model additions:

- `Meetup.requires_payment: boolean` — default `false`. Settable at creation and
  toggleable afterwards while the meetup is not finalized.
- `Rsvp.has_paid: boolean` — default `false`. Only meaningful when the meetup has
  `requires_payment=true`.
- `Rsvp.paid_at: string (ISO datetime) | null`.

Endpoints, all under `/organizations/{org_id}/meetups/...`:

| Endpoint                                           | Method | Permission | Notes                                          |
| -------------------------------------------------- | ------ | ---------- | ---------------------------------------------- |
| `/`                                                | POST   | any member | Body accepts optional `requires_payment`       |
| `/{meetup_id}/guests/{mazmo_user_id}/payment`      | PATCH  | org admin  | No body. Returns guest + `paid_at` + `paid_by` |
| `/{meetup_id}/guests/{mazmo_user_id}/payment/undo` | PATCH  | org admin  | Body `{ reason }`, 5-500 chars                 |
| `/{meetup_id}/enable-payment`                      | PATCH  | org admin  | No body. Returns `MeetupPublic`                |
| `/{meetup_id}/disable-payment`                     | PATCH  | org admin  | No body. Returns `MeetupPublic`                |
| `/{meetup_id}/guests/{mazmo_user_id}/checkin`      | POST   | any member | Now 409s when the guest has not paid           |
| `/{meetup_id}/guests`                              | GET    | any member | Each `rsvp` now carries `has_paid`, `paid_at`  |

Two backend behaviors drive UI decisions:

1. **The check-in block is hard.** Unlike a banned guest, where staff can override
   in a confirmation dialog, there is no override for an unpaid guest. The only
   way through is for an admin to mark the payment first.
2. **Toggling `requires_payment` is not retroactive.** Guests already checked in
   stay checked in. Existing `has_paid` values are never cleared when payment is
   disabled, so re-enabling it later keeps them valid.

The audit trail gains four event types: `PAYMENT_RECORDED`, `PAYMENT_REVOKED`,
`PAYMENT_REQUIREMENT_ENABLED`, `PAYMENT_REQUIREMENT_DISABLED`. The two
`PAYMENT_REQUIREMENT_*` events are meetup-level and carry no `guest`.
`PAYMENT_REVOKED` is the only one of the four with a `reason`.

## Permissions

The existing `isOrgAdmin = isSiteAdmin || activeOrg?.role === "ADMIN"` check
(see `GuestsPage.tsx:663`) gates every payment mutation. Staff can see payment
state and are blocked by it, but cannot change it.

| Action                                  | Staff | Org admin | Site admin |
| --------------------------------------- | ----- | --------- | ---------- |
| Create meetup with `requires_payment`   | Yes   | Yes       | Yes        |
| See `has_paid` / `paid_at`              | Yes   | Yes       | Yes        |
| Mark a guest's payment                  | No    | Yes       | Yes        |
| Undo a payment                          | No    | Yes       | Yes        |
| Toggle the meetup's payment requirement | No    | Yes       | Yes        |

---

## Components

### 1. `NewMeetupDialog` — create a paid meetup (`src/features/meetups/MeetupsPage.tsx`)

Add a checkbox, "Requires payment", below the Mazmo URL field. No admin gate, to
stay consistent with the rest of the dialog: the create endpoint lets any org
member set this field.

The POST body includes `requires_payment` only when the box is checked; omitting
it preserves today's behavior exactly. Reset the checkbox alongside `name` and
`url` in `onSuccess`.

`src/components/ui/` has neither a `Checkbox` nor a `Switch` component today, so
one has to be added. Use a checkbox, since this is a field inside a create form
rather than a setting that applies immediately. Follow the shadcn/ui conventions
already used by the other primitives in that directory, including the kebab-case
filename (`checkbox.tsx`).

### 2. `MeetupsPage` table — paid-event badge

In the meetups table, render a `Badge variant="outline"` reading "Paid event"
next to `meetup.name` when `requires_payment` is true. This mirrors how the guest
table already flags walk-ins and banned guests, and lets an admin see which
events are paid without opening each one.

### 3. `MeetupDetailPage` header — toggle the payment requirement

Visible only when `isOrgAdmin`. Sits in the existing header button row alongside
"Add walk-in" and "Sync from Mazmo" (`MeetupDetailPage.tsx:553`), rendered as a
button whose label reflects the current state:

- `requires_payment === false` → "Enable payment"
- `requires_payment === true` → "Disable payment"

Clicking opens `PaymentRequirementDialog`, a small confirmation dialog. Copy
differs per direction, because the consequences differ:

- **Enabling:** warn that guests who have not paid will no longer be able to
  check in, and that guests already checked in are unaffected.
- **Disabling:** state that recorded payments are kept, so re-enabling later
  restores them.

Confirming calls `PATCH .../enable-payment` or `.../disable-payment`, then
invalidates `["meetup", orgId, id]`. On error, show the backend message via
`extractApiError` in a toast, matching every other mutation on this page.

Disable the button when `meetup.is_finalized`, since the backend 409s in that
case. Note the frontend has no finalize/unfinalize UI at all today, so
`is_finalized` can only be true for meetups finalized through the API directly.
Building that UI is out of scope here.

### 4. `MeetupDetailPage` guest table — "Payment" column

A new column, rendered **only when `meetup.requires_payment`**, placed between
the existing "Status" (check-in) column and the actions column. When the meetup
is free, the table is byte-for-byte what it is today.

Per row:

**Paid** — `Badge` reading "Paid", with `formatDateTime(rsvp.paid_at)` in
`text-xs text-muted-foreground` underneath. This is the same two-line treatment
the Status column already uses for "Checked in" + `arrival_time`
(`MeetupDetailPage.tsx:740`). Admins additionally get a ghost "Undo" button.

**Not paid** — `Badge variant="secondary"` reading "Payment pending". Admins
additionally get a "Mark paid" button.

Staff who are not admins see the badge only, with no buttons.

The `xl:table-fixed` column widths on this table (`6% / 44% / 20% / 18%`) need
rebalancing when the payment column is present, since they currently sum to 88%
across four columns plus a fixed-width actions column. Two sets of widths keyed
off `requires_payment` is fine; so is dropping the fixed layout for paid meetups.
Pick whichever reads better in the browser.

### 5. `MarkPaidDialog`

Opened from the "Mark paid" button. A confirmation dialog with no form fields,
since the endpoint takes no body: it names the guest and asks the admin to
confirm they received the entrance fee.

Confirming calls `PATCH .../payment` and invalidates
`["meetup-guests", orgId, meetupId]`. Success shows a toast naming the guest.

Errors surface through `extractApiError` in a toast. The backend messages for the
relevant 409s (meetup does not require payment, guest already paid, meetup
finalized) are already written to explain the fix, so passing them through is
enough — no per-status message table needed.

### 6. `UndoPaymentDialog`

A near-copy of the existing `UndoDialog` (`MeetupDetailPage.tsx:97`): `Textarea`
for the reason, live `length/500` counter, confirm button disabled unless the
trimmed reason is 5-500 characters, `variant="destructive"`.

Calls `PATCH .../payment/undo` with `{ reason }` and invalidates
`["meetup-guests", orgId, meetupId]`.

The two undo dialogs are structurally identical apart from their endpoint, title,
and placeholder. Extract the shared shell into a single `ReasonDialog` component
at `src/components/ReasonDialog.tsx` that both use, rather than duplicating ~85
lines. It goes outside `src/components/ui/`, which holds shadcn primitives, and
takes the PascalCase filename that app-level components use elsewhere.
`BanDialog` (`GuestsPage.tsx:90`) is a third instance of the same pattern and can
adopt it later, but converting it is not part of this work.

### 7. `MeetupDetailPage` actions column — blocked check-in

When `meetup.requires_payment && !rsvp.has_paid`, replace the "Check In" button
with a disabled one. Same label, `variant="secondary"`, `disabled`, plus a
`title` attribute explaining that the guest has to pay first — so the reason is
reachable on hover and by screen readers without adding a tooltip dependency.

This applies to **every role, including admins**. The admin resolves it from the
"Mark paid" button one column to the left; duplicating that action here would put
the same mutation in two places in the same row. Once payment is recorded, the
query invalidation re-renders the row with a working "Check In" button.

**Banned and unpaid at once:** the payment block wins. Do not open
`CheckInBannedDialog` for an unpaid guest, since its "Check in anyway" button
would 409 on payment regardless of the ban override. Once the guest is marked
paid, the row reverts to today's behavior: banned guests get the override dialog,
everyone else checks in directly.

### 8. `EventsPage` — audit log (`src/features/events/EventsPage.tsx`)

Add the four new event types to `EVENT_BADGE_VARIANT` and `eventTypeLabel`:

| Event type                     | Badge variant | Label (en)       |
| ------------------------------ | ------------- | ---------------- |
| `PAYMENT_RECORDED`             | `default`     | Payment recorded |
| `PAYMENT_REVOKED`              | `secondary`   | Payment revoked  |
| `PAYMENT_REQUIREMENT_ENABLED`  | `outline`     | Payment enabled  |
| `PAYMENT_REQUIREMENT_DISABLED` | `outline`     | Payment disabled |

Add `PAYMENT_RECORDED` and `PAYMENT_REVOKED` to the filter dropdown. The two
`PAYMENT_REQUIREMENT_*` types stay out of the dropdown, matching how
`MEETUP_FINALIZED` and `MEETUP_UNFINALIZED` are already labeled but not
filterable — closing that preexisting gap is not part of this work.

The existing table renders `guest` and `reason` as `—` when null, so the
meetup-level events need no special handling.

### 9. Types and i18n

Regenerate `src/api/types.ts` from the backend's `openapi.json`, which is kept
current by a pre-commit hook in that repo. This is mechanical; the payment fields
and endpoints then flow into the typed `api` client.

Every new string goes through `useLanguage()` with entries in both the `en` and
`es` blocks of `src/lib/i18n.tsx`. Follow the existing Spanish vocabulary of the
app: it uses club-specific terms rather than literal translations (`banned` is
"Vanteado", `walk-in` is "Discreto"). Payment terms have no such established
slang, so plain Spanish is right: "Pagado", "Pago pendiente", "Marcar como
pagado".

---

## Testing

Follow the existing setup: Vitest with the mocked `api` client, and test files
colocated next to the code they cover (`RecoveryCodeDialog.test.tsx`,
`input-with-prefix.test.tsx`), with shared configuration in `src/tests/setup.ts`.
The behaviors worth pinning down are the ones where a wrong branch silently
breaks the door workflow:

- The Payment column and the header toggle do not render when
  `requires_payment` is false.
- Staff who are not admins see payment badges but no "Mark paid" or "Undo".
- "Check In" is disabled for an unpaid guest on a paid meetup, for both staff and
  admins, and enabled once `has_paid` is true.
- A guest who is both banned and unpaid does not open `CheckInBannedDialog`.
- `UndoPaymentDialog` keeps its confirm button disabled below 5 characters.

## Out of scope

- **A generic filter system for the guest table** (RSVP date range, paid/unpaid,
  arrived/not arrived, walk-in, banned). Agreed to be brainstormed and specced
  as its own project after this one ships.
- Finalize/unfinalize UI, which the backend has supported for a while and the
  frontend has never exposed.
- Editing a meetup's name, URL, or date. The backend has no endpoint for this.
- Any notion of an amount or currency. Payment is strictly a boolean; recording
  how much each guest paid would need a backend change first.
- Payment gateway integration. Everything is recorded by hand.
