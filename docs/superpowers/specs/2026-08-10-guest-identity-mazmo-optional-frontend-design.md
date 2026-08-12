# Guest Identity — Mazmo Optional (Frontend) — Design Spec

**Date:** 2026-08-10

## Overview

The backend (`alter-tracker-backend` PR #15, merged to `main`) decoupled guest
identity from Mazmo: a guest can now exist without ever having a Mazmo account.
This is a breaking API change for every guest-related endpoint, plus a set of
new capabilities (manual guest creation, linking/unlinking a Mazmo account
after the fact, editing a guest's name/Instagram handle, server-side guest
search). This spec covers the frontend work needed to match, in one pass.

The backend is not deployed to production yet — it's on `main`, running
locally at `http://0.0.0.0:8000`. There is no prod-breakage urgency, so this
spec bundles the required parity fixes together with the new UI capabilities
the backend now supports, rather than shipping them as two separate efforts.

## Backend contract (already shipped)

Identity fields on `GuestPublic` / `GuestWithBanPublic` / `BannedGuestPublic` /
`EventGuestPublic`:

```
id: uuid                        # new — the real primary key now
mazmo_user_id: number | null    # was: number, required
mazmo_handle: string | null     # was: "username", required
displayname: string             # unchanged
instagram_username: string | null   # new
```

Path params: every `{mazmo_user_id}` under `/organizations/{org_id}/...`
(ban, unban, add-walkin, checkin, undo-checkin, payment, payment/undo)
becomes `{guest_id}` (uuid).

Endpoints:

| Endpoint                          | Method | Permission    | Notes                                                                                                                 |
| --------------------------------- | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/guests/mazmo`                   | POST   | approved user | Same as old `POST /guests/`. Now also accepts `instagram_username`.                                                   |
| `/guests/manual`                  | POST   | approved user | New. `displayname` + optional `instagram_username`. No dedup check.                                                   |
| `/guests/`                        | GET    | approved user | Now accepts `?q=` (matches displayname or mazmo_handle).                                                              |
| `/guests/{guest_id}/link-mazmo`   | PATCH  | approved user | Body `{ username }`. 409 if already linked, 409 if that Mazmo account belongs to someone else.                        |
| `/guests/{guest_id}/unlink-mazmo` | PATCH  | approved user | No body. 409 if not linked, 409 if the guest has an active ban in **any** org (ban-evasion guard).                    |
| `/guests/{guest_id}`              | PATCH  | approved user | Body `{ displayname?, instagram_username? }`. Omitted = untouched, explicit `null` on `instagram_username` clears it. |

**Permission note — this is the one detail most likely to be gotten wrong:**
link, unlink, and edit only require an _approved user_, not org admin. Any
staff member can do these. Ban/unban remain org-admin-only, unchanged.

Two new `EventType` values: `GUEST_MAZMO_LINKED`, `GUEST_MAZMO_UNLINKED`.
Both are global events (`org_id` is null), same as the existing
`GUEST_CREATED`.

## Files affected

| File                                             | Why                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `src/api/types.ts`                               | Regenerate from `openapi.json`                                        |
| `src/hooks/useGuestSearch.ts`                    | `username` → nullable `mazmoHandle`                                   |
| `src/features/guests/GuestsPage.tsx`             | Path renames, nullable handle, new dialogs, new tab UI, server search |
| `src/features/meetups/MeetupDetailPage.tsx`      | Path renames, nullable handle, `Set<number>` → `Set<string>`          |
| `src/features/meetups/MeetupDetailPage.test.tsx` | Fixture shape                                                         |
| `src/features/events/EventsPage.tsx`             | Two new `EventType` entries                                           |
| `src/lib/i18n.tsx`                               | New strings, `en` + `es`                                              |

No changes needed in `OrganizationDetailPage.tsx` or `DashboardPage.tsx` —
their `.username` references are `UserPublic` (staff), not guest, and
`GET /guests/` didn't change shape.

---

## 1. Parity migration (breaking-change fixes)

### `GuestsPage.tsx`

- `BanDialog` / unban mutation: `{mazmo_user_id: guest.mazmo_user_id}` →
  `{guest_id: guest.id}` in both the ban and unban path params.
- Every `g.username` / `g.mazmo_user_id` used as a React `key` becomes
  `g.id`.
- Sort comparator for the old `"username"` column key now sorts on
  `mazmo_handle`, null-safe: `(a.mazmo_handle ?? "").localeCompare(b.mazmo_handle ?? "")`.
  Guests without a handle sort as empty string (i.e., first when ascending).

### `MeetupDetailPage.tsx`

- Six call sites change their path param from `mazmo_user_id: guest.mazmo_user_id`
  (number) to `guest_id: guest.id` (string): `checkInMutation`, `UndoDialog`
  (undo-checkin), `MarkPaidDialog` (payment), `UndoPaymentDialog`
  (payment/undo), `CheckInBannedDialog` ("check in anyway" override — this one
  hits the *same* `checkin` endpoint as `checkInMutation`, from a second call
  site), and `WalkinDialog`'s add-walkin mutation.
- `rsvpedIds` (`Set<number>` built from `g.guest.mazmo_user_id`) and
  `alreadyRsvped` (passed into `WalkinDialog`, typed `Set<number>`) become
  `Set<string>` built from `g.guest.id`. Update the `WalkinDialog` prop type
  accordingly.
- All `React` `key={...guest.mazmo_user_id}` → `key={...guest.id}`, including
  the `aria-describedby`/`id` pair on the disabled "blocked by payment"
  check-in button (`checkin-blocked-${mg.guest.id}`).
- Every `guest.username` / `g.username` display renders nullable now:
  `{mg.guest.mazmo_handle ? \`@${mg.guest.mazmo_handle}\` : t("noMazmoHandle")}`.
Applies in the guest table row, and in `WalkinDialog`'s candidate list.

### `MeetupDetailPage.test.tsx`

The `guest()` fixture helper currently takes `mazmo_user_id` and derives
`username` from it. Update it to also generate an `id` (a stable fake UUID
per call is fine, e.g. templated off the numeric seed) and a `mazmo_handle`.
Existing test cases that only care about `has_paid`/`displayname` need no
behavioral changes, just the fixture shape.

### `EventsPage.tsx`

Add to both `EVENT_BADGE_VARIANT` and `eventTypeLabel` (TypeScript will
otherwise fail to compile, since both are typed `Record<EventType, ...>` and
`EventType` gains two members):

| Event type             | Badge variant | Label (en)             | Label (es)                   |
| ---------------------- | ------------- | ---------------------- | ---------------------------- |
| `GUEST_MAZMO_LINKED`   | `outline`     | Mazmo account linked   | Cuenta de Mazmo vinculada    |
| `GUEST_MAZMO_UNLINKED` | `outline`     | Mazmo account unlinked | Cuenta de Mazmo desvinculada |

Not added to the filter `<Select>` dropdown — same treatment as the existing
`GUEST_CREATED`, `MEETUP_FINALIZED`, `MEETUP_UNFINALIZED`: labeled and
badge-colored, but not filterable. That gap is pre-existing and not part of
this work.

### `useGuestSearch.ts`

`getFields` return shape changes from `{ displayname, username }` to
`{ displayname, mazmoHandle: string | null }`. The filter predicate becomes:

```ts
displayname.toLowerCase().includes(q) ||
  (mazmoHandle ?? "").toLowerCase().includes(q);
```

Callers: `BannedGuestsTab` (unaffected data flow, just field rename) and the
guest-list search box inside `MeetupDetailPage` (searches the meetup's
already-loaded RSVP list, not `/guests/`). `AllGuestsTab` stops using this
hook — see §4.

---

## 2. New capability: create a guest without Mazmo

`AddGuestDialog` (`GuestsPage.tsx`) gains two tabs via the existing `Tabs`
primitive, replacing today's single-purpose form:

- **"Con Mazmo"** — today's flow, unchanged behavior: `@handle` input via
  `InputWithPrefix`, plus a new optional Instagram field. Submits to
  `POST /guests/mazmo`. Same 404/409/504 error messages as today.
- **"Manual"** — new: `displayname` (required) input, plus the same optional
  Instagram field. Submits to `POST /guests/manual`. No dedup check exists on
  this endpoint by design (no external identifier to dedupe against), so no
  409 case to handle here — only generic failure.

Both tabs share the Instagram field's normalization expectation (leading `@`
is optional on input; the backend strips it, so no client-side stripping is
needed — just don't double up the `@` if the user types one into a field that
already shows a prefix. Use a plain `Input`, not `InputWithPrefix`, for
Instagram, since the field is optional and a bare prefix looks odd on an
empty optional field).

On success, invalidate `["guests"]` (and `["guests", q]` variants — see §4)
same as today.

---

## 3. New capability: per-row identity management

Each row in `AllGuestsTab` gets a `DropdownMenu` (the primitive already
exists in `src/components/ui/`) replacing today's single "Ban" button:

- **Edit** — always visible to any approved user. Opens `EditGuestDialog`:
  `displayname` and `instagram_username` fields, pre-filled. Submits
  `PATCH /guests/{id}` with only the changed fields present in the body
  (omit unchanged keys rather than sending `null`, since the backend treats
  "key present as null" as "clear this field" only for `instagram_username`).
- **Link Mazmo account** — visible when `mazmo_handle` is null. Opens
  `LinkMazmoDialog`: single `@handle` input (`InputWithPrefix`, same as the
  "Con Mazmo" tab). Submits `PATCH /guests/{id}/link-mazmo`. Same 404/409/504
  handling as guest creation, plus the two link-specific 409s (already linked,
  handle belongs to someone else) — surface the backend's `detail` message
  via `extractApiError`, since it already names the conflicting guest.
- **Unlink Mazmo account** — visible when `mazmo_handle` is set. A plain
  confirm (no form fields — the endpoint takes no body): "Unlink `@handle`
  from `displayname`?" Submits `PATCH /guests/{id}/unlink-mazmo`. On 409
  (active ban in some org), show the backend's `detail` as-is via
  `extractApiError` — it already names the org and points to the fix.
- **Vantear (ban)** — only when `isOrgAdmin`, same `BanDialog` as today,
  unchanged except for the path param rename in §1.

All four items live in one dropdown per row rather than as separate inline
buttons, since the row can now have up to 4 possible actions and inline
buttons would crowd the table at the widths already in use.

`EditGuestDialog`, `LinkMazmoDialog`, and the unlink confirm all follow the
existing `Dialog`/`DialogContent`/`DialogFooter` shell used by `BanDialog` and
`AddGuestDialog` — no new dialog primitive needed.

On success, each mutation invalidates `["guests"]` and, where relevant,
`["guests-banned", orgId]` (unlink can only ever affect a guest with no active
ban by construction, so banned-list invalidation isn't needed there).

---

## 4. `AllGuestsTab`: table columns and search

**Columns** (keeping all 5, per your call): Display name, Mazmo handle,
Mazmo ID, Instagram, Actions (the dropdown from §3). Mazmo handle and Mazmo ID
both render `t("noMazmoHandle")` / `"—"` respectively when null. Instagram
renders `@instagram_username` or `"—"`. Existing `lg:w-[…]` fixed-width splits
(currently 40/30/15% across 3 data columns) need rebalancing across 4 data
columns plus the actions column — pick whatever reads well in the browser,
same latitude the payment-tracking work already used for this table.

Sorting: add `"instagram_username"` as a sortable column, null-safe compare
same pattern as `mazmo_handle`. `"mazmo_user_id"` sort stays numeric but must
treat `null` as sorting last regardless of direction (a guest with no Mazmo ID
isn't meaningfully "less than" one with `mazmo_user_id: 3`).

**Search**: `AllGuestsTab` switches from client-side `useGuestSearch` to
`GET /guests/?q=`, since the backend added this specifically for guest search
and it also matches on `mazmo_handle` server-side (which the client-side
version already did, so behavior is preserved, not changed). Add a small
`useDebouncedValue` hook (`src/hooks/useDebouncedValue.ts`, ~10 lines,
`setTimeout`-based, 300ms). Key the query as `debouncedQuery ? ["guests", debouncedQuery] : ["guests"]`
— the empty-query case keeps the exact `["guests"]` key already used
elsewhere (`DashboardPage`, `WalkinDialog`), so a plain `invalidateQueries({
queryKey: ["guests"] })` after a create/edit/link/unlink still catches every
variant via react-query's default prefix matching, and the unfiltered list
doesn't needlessly become a second cache entry. Omit `q` from the request
entirely when empty, rather than sending `q=""`.

`BannedGuestsTab` and `MeetupDetailPage`'s in-page guest search stay
client-side — both filter a list already loaded for another reason (the
banned list has no `?q=` endpoint; the meetup guest list is RSVP-scoped data,
not the global guest list), so there's nothing to gain from a server round
trip.

---

## 5. i18n

New keys needed in both `en` and `es` blocks of `src/lib/i18n.tsx`:
tab labels ("Con Mazmo" / "Manual"), `noMazmoHandle` ("No Mazmo account" /
"Sin cuenta de Mazmo"), Instagram field label/placeholder, edit dialog copy,
link/unlink dialog copy and confirm/pending labels, the two new event labels
from §1. Follow the existing house style: club-specific slang where it
already exists (ban stays "Vantear"/"Vanteado"), plain Spanish elsewhere —
there's no established slang for "link a Mazmo account," so keep it literal
("Vincular cuenta de Mazmo").

---

## Testing

- `MeetupDetailPage.test.tsx`: update fixtures (§1); existing assertions
  should keep passing unchanged since they don't touch `id`/`mazmo_handle`
  directly.
- New: `EditGuestDialog` — submitting with only `displayname` changed doesn't
  send `instagram_username` in the body (omitted-key semantics); submitting
  with the Instagram field cleared to empty sends `instagram_username: null`
  explicitly.
- New: `AllGuestsTab` — dropdown shows "Link Mazmo account" for a guest with
  `mazmo_handle: null` and "Unlink Mazmo account" for one with a handle, never
  both.
- New: a guest with `mazmo_handle: null` renders `noMazmoHandle` text instead
  of `@null` or a blank cell, in both `GuestsPage` and `MeetupDetailPage`.
- New: the guest search box debounces — typing three characters quickly
  fires one request, not three (mock timers).

## Out of scope

- `WalkinDialog`'s candidate search stays client-side filtering over the
  already-fetched `/guests/` list; only field names/null-safety change. It
  isn't the same use case as the global search box, and the backend didn't
  add anything specific to walk-in candidate search.
- `CheckInPage.tsx` stays a stub ("Coming soon") — unrelated to this change.
- No visual "no Mazmo" badge/icon beyond the text label; if it reads oddly in
  the browser once built, that's a follow-up polish pass, not a blocker here.
- Merging two guest identities (e.g., a manually-created guest and a
  Mazmo-linked guest that turn out to be the same person) — the backend
  explicitly does not support this (`link-mazmo` 409s rather than merging).
