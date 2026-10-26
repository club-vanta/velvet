# Guest card status lines (mobile)

## Intent

On phones the meetup guest card spends four stacked lines on one fact ("Ingreso" label, "✓ Ingresado" badge, date, "Deshacer"), and "Ingreso: Pendiente" repeats what the "Ingresar" button already says. The same list serves two jobs at the door: finding a guest and checking them in fast, and scanning who came and who did not. The card should state each fact once, in one readable line, and let color carry the status so the list can be scanned without reading.

## Goals

- One line per status, no labels: "✓ Ingresó 4 oct, 12:20 a. m." with its undo on the right.
- Color by meaning: green for check-in done, violet for paid, amber for something missing (unpaid entrance fee), neutral for exempt.
- The arrival order (`#4`) moves from the header into the check-in line, since it is part of the same fact.
- Keep the full date and time.

## Non-goals

- The desktop table does not change.
- No change to which actions show when (finalized, banned, blocked by payment, undo rules stay as they are).

## Anti-goals

- No "Falta ingresar" line for a guest who has not checked in: the "Ingresar" button already says it, and repeating it is what the user disliked.

## Approaches

1. **New `GuestStatusLine` component (chosen).** Takes a tone (`done`, `paid`, `missing`, `neutral`), content, and an optional action. `GuestCard` drops the label grid and stacks these lines. `CheckInStatus` and `PaymentStatus` stay as they are for the table. Keeps the change on mobile, as asked, with one job per component.
2. Rework `CheckInStatus` and `PaymentStatus` to render lines too, with a table and a card variant. One source per status, but it touches the desktop table and mixes two layouts in each component.

The user picked 1.

## Design

Card layout, top to bottom:

1. Header: avatar, name, handle, guest badges, RSVP line, row menu. The `#order` badge is no longer here.
2. Status lines, each a full-width tinted band with a top border:
   - **Checked in** (green): `#order` pill, "✓ Ingresó", arrival date and time, "Deshacer" on the right.
   - **Paid** (violet): "Pagó", paid date and time, "Deshacer pago" on the right (admins only, as today).
   - **Unpaid** (amber): "Falta pagar la entrada". Shown only when the meetup charges a fee, the guest is not exempt, and has not paid.
   - **Exempt** (neutral): "Exento". If the guest paid before becoming exempt, the violet paid line shows instead, keeping "Deshacer pago".
   - Not checked in: no line.
3. Actions band (unchanged rules): "Marcar como pagado" and "Ingresar". When the unpaid line sits right above it, the band drops its top border so they read as one block.

Order of lines: check-in first, then payment.

Colors follow the existing pattern in `src/components/GuestBadges.tsx`: `border-X-500/30 bg-X-500/10 text-X-700 dark:text-X-300` with `emerald`, `violet`, and `amber`. Small text must keep 4.5:1 contrast in both themes.

The approved mockup is variant 1 in `.superpowers/brainstorm/1607479-1793029388/content/guest-card-mobile-v2.html`, with the paid line in violet instead of green.

## Calls made by Claude (user can override)

- Exempt guests get a neutral "Exento" line.
- Icons: lucide `Check` for check-in and a money icon for payment, `aria-hidden`, instead of the "✓" and "$" characters, so the text reads cleanly to screen readers.
- The amber unpaid line gets an id, and the disabled "Ingresar" button points `aria-describedby` at it, replacing today's `sr-only` copy of the same message.
- New strings go in `src/lib/i18n.tsx` in English and Spanish ("Checked in" / "Ingresó", "Paid" / "Pagó", "Entrance fee not paid" / "Falta pagar la entrada").

## Left to the builder

- Exact spacing and pill styling, matching the mockup.
- Tests: each line state (checked in, pending, paid, unpaid, exempt, paid-before-exempt), the arrival order in the line, and that the table is unchanged. The mobile branch needs the `matchMedia` stub.
