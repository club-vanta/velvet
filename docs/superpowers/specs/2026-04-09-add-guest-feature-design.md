# Add Guest Feature — Design Spec

**Date:** 2026-04-09

## Overview

Add an "Add new guest" button to the Guests page that lets any approved staff member manually register a guest by their Mazmo username handle. This covers guests who have never been synced via a meetup RSVP.

---

## Components

### 1. `InputWithPrefix` (`src/components/ui/input-with-prefix.tsx`)

A reusable input component that renders a non-editable prefix (e.g. `@`, `$`) visually attached to the left of the input field.

**Props:**

- `prefix: string` — the decorative prefix text rendered on the left
- All standard `<input>` props (forwarded to the inner input)

**Visual design:**

- A wrapper `div` mimics the `Input` border and shape (`rounded-lg border border-input`)
- The prefix sits on the left, separated by a right border, with `text-muted-foreground` color and `bg-input/30` background
- The editable `<input>` takes up the remaining width, no border of its own
- Focus ring (`focus-visible:ring-3 focus-visible:ring-ring/50 focus-within:border-ring`) is applied on the wrapper via `focus-within`

---

### 2. `AddGuestDialog` (inside `src/features/guests/GuestsPage.tsx`)

A dialog for registering a guest by Mazmo username.

**Trigger:** "Add new guest" button in the `GuestsPage` header (default/primary variant, same as "New Meetup" in `MeetupsPage`).

**Form:**

- Single field: Mazmo username, rendered with `InputWithPrefix prefix="@"`
- "Add" button disabled when field is empty or request is pending

**API call:** `POST /guests/` with `{ username }`

**Error handling:**

| Status | Message                                                       |
| ------ | ------------------------------------------------------------- |
| 404    | "No se encontró el usuario en Mazmo. Revisá el handle."       |
| 409    | "Este guest ya está registrado en el sistema."                |
| 504    | "No se pudo conectar a Mazmo. Intentá de nuevo."              |
| other  | Backend `detail` field or "Algo salió mal. Intentá de nuevo." |

**On success:** invalidate `["guests"]` query, show toast, close dialog.

---

### 3. `GuestsPage` header update (`src/features/guests/GuestsPage.tsx`)

Change the current `<h1>` to a `flex justify-between items-center` row:

```
Guests                    [Add new guest]
```

The button is visible to all approved staff (no admin gate).

---

## Out of scope

- No new route or page
- No changes to the Banned tab
- No search/autocomplete against Mazmo — staff types the exact handle
