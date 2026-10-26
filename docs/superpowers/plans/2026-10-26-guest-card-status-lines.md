# Guest card status lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On phones, replace the guest card's labelled "Ingreso / Pago" grid with one tinted line per status (green check-in, violet paid, amber unpaid, neutral exempt).

**Architecture:** A new presentational `GuestStatusLine` renders one tinted band with a tone, content and an optional trailing action. `MeetupDetailPage` gains `renderCardStatuses(mg)`, which decides which lines a guest gets, next to the existing `render*` helpers. `GuestCard` swaps its `checkIn`/`payment`/`order` props for one `statuses` slot. The desktop table keeps `CheckInStatus` and `PaymentStatus` untouched.

**Tech Stack:** React 19 + React Compiler, Tailwind v4, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-26-guest-card-status-lines-design.md`

## Global Constraints

- Desktop table rendering does not change.
- Rules for when actions show (finalized, banned, blocked by payment, admin-only undo payment) do not change.
- No line for a guest who has not checked in.
- Full date and time via `formatDateTime` from `@/lib/format`.
- Tone classes follow `GuestBadges.tsx`: `border-X-500/30 bg-X-500/10 text-X-700 dark:text-X-300`; `done` = emerald, `paid` = violet, `missing` = amber, `neutral` = muted (`bg-muted/40 text-muted-foreground`).
- Every new string in `src/lib/i18n.tsx` in English and Spanish. No `useMemo`/`useCallback`. No em dashes.
- Gates: `npm run check`, `npm run test:run`, `npm run build`.

## Review Focus

1. Payment state still loading (`paymentStateKnown` false): no amber line, since loading is not "unpaid"; check-in stays disabled as today.
2. Paid guest later made exempt: violet "Paid" line with "Undo payment" for admins, no neutral "Exempt" line.
3. Non-admin viewing a paid guest: violet line without "Undo payment".
4. Checked in with `arrival_order` null (old data): green line without the `#` pill, no empty pill.
5. Finalized meetup with an unpaid guest: amber line still shows, actions band gone.

Each has a test in Task 2.

---

### Task 1: `GuestStatusLine` and its strings

**Files:**

- Create: `src/features/meetups/GuestStatusLine.tsx`
- Create: `src/features/meetups/GuestStatusLine.test.tsx`
- Modify: `src/lib/i18n.tsx` (en and es blocks)

**Interfaces:**

- Produces:
  ```ts
  export type StatusTone = "done" | "paid" | "missing" | "neutral";
  export function GuestStatusLine(props: {
    tone: StatusTone;
    icon?: LucideIcon; // rendered aria-hidden
    children: ReactNode; // the sentence, e.g. label + time
    action?: ReactNode; // right-aligned, e.g. an InlineUndo
    id?: string; // so a disabled button can point aria-describedby at it
  }): JSX.Element;
  ```
  Renders a `div` (not a list item; the card is already the `li`) with `flex items-center gap-2 border-t px-3 py-2 text-sm` plus the tone classes.
- i18n keys (en / es):
  - `statusCheckedIn`: "Checked in" / "Ingresó"
  - `statusPaid`: "Paid" / "Pagó"
  - `statusUnpaid`: "Entrance fee not paid" / "Falta pagar la entrada"

- [ ] **Step 1: Write the failing tests** in `GuestStatusLine.test.tsx`:
  - `it("renders the sentence and the action")`: render with `tone="done"`, children `"Checked in"`, action `<button>Undo</button>`; `getByText("Checked in")` and `getByRole("button", { name: "Undo" })` exist.
  - `it("hides the icon from assistive tech")`: with `icon={Check}`, `container.querySelector("svg")` has `aria-hidden="true"`.
  - `it("exposes its id for aria-describedby")`: with `id="x"`, `container.querySelector("#x")` has text content `"Entrance fee not paid"` (exact, via `toHaveTextContent` on that node only).
  - `it.each([["done","emerald"],["paid","violet"],["missing","amber"]])("tints the %s tone %s")`: the root element's `className` contains `bg-${color}-500/10`.
- [ ] **Step 2:** `npx vitest run src/features/meetups/GuestStatusLine.test.tsx`, expect FAIL (module not found).
- [ ] **Step 3:** Implement `GuestStatusLine` (tone to class map as a `Record<StatusTone, string>` const, like `GUEST_TYPE_CLASS`) and add the three i18n keys in both languages.
- [ ] **Step 4:** Same command, expect PASS. `npm run check` clean.
- [ ] **Step 5: Commit**
  ```bash
  git add src/features/meetups/GuestStatusLine.tsx src/features/meetups/GuestStatusLine.test.tsx src/lib/i18n.tsx
  git commit -m "feat: add a tinted status line for the guest card"
  ```

### Task 2: Wire the lines into the phone card

**Files:**

- Modify: `src/features/meetups/GuestCard.tsx`
- Modify: `src/features/meetups/MeetupDetailPage.tsx` (`renderCheckIn`, `renderCard`, new `renderCardStatuses`; export or keep `InlineUndo` in the same file)
- Modify: `src/features/meetups/MeetupDetailPage.test.tsx` (`describe("MeetupDetailPage on phones")`)

**Interfaces:**

- Consumes: `GuestStatusLine`, `StatusTone`, keys `statusCheckedIn`, `statusPaid`, `statusUnpaid` from Task 1; existing `paymentExempt`, `undo`, `undoPayment`, `rowState`, `InlineUndo`, `ordinal`.
- `GuestCard` props become `{ identity, menu, statuses: ReactNode, actions, dimmed }`. `order`, `checkIn` and `payment` are removed, and so is `GuestCardState` and the `<dl>`. `statuses` renders between the header and the actions band. Required visual result: the amber line and the buttons read as one block, with no rule between them (the mockup drops the band's top border there). The Tailwind used to get it is the builder's call.
- `renderCheckIn(mg, blockedHintId?: string)`: when `blockedHintId` is given, the payment-blocked button uses `aria-describedby={blockedHintId}` and does not render its own `sr-only` span. The table call stays `renderCheckIn(mg)`.
- `renderCardStatuses(mg): ReactNode` order and rules:
  1. `has_arrived`: `done` line, icon `Check`. Content: the `#` pill (`ordinal(arrival_order)`, only when not null) then `t("statusCheckedIn")` and `formatDateTime(arrival_time)` when present. Action: `InlineUndo` "Undo", opening `setUndoTarget(mg)` (same rule as today's card, always passed).
  2. Payment, only when `requiresPayment`:
     - `has_paid`: `paid` line, icon `Banknote`, `t("statusPaid")` and `formatDateTime(paid_at)`. Action: `InlineUndo` "Undo payment" when `isOrgAdmin`.
     - else exempt: `neutral` line, `t("paymentExempt")`.
     - else when `paymentStateKnown`: `missing` line, icon `Banknote`, `t("statusUnpaid")`, `id={\`checkin-blocked-${mg.guest.id}\`}`.
  3. Exempt with no fee: no payment line (as today, the payment column is gone when the meetup is free).

- [ ] **Step 1: Replace the phone tests that assert `term`/`definition`** ("puts both states in labelled columns...", "opens the undo dialog from the card's check-in column", "leaves out the payment column when the meetup is free") **and add**, all inside `describe("MeetupDetailPage on phones")`:
  - `it("shows check-in and payment as one line each, with their undos")`: arrived + paid guest, `arrival_order: 1`, `arrival_time: "2026-09-01T23:00:00Z"`. `within(card).queryAllByRole("term")` has length 0; `getByText("Checked in")` and `getByText("Paid")` exist; the line containing "Checked in" (`.closest("div")`) contains `getByText(ordinal(1))` and the button "Undo"; the "Paid" line contains "Undo payment". No "Check in" / "Mark paid" buttons.
  - `it("opens the undo dialog from the check-in line")`: click "Undo", dialog "Undo check-in for Arrived?" opens.
  - `it("shows no check-in line for a guest who has not arrived")`: free meetup, not arrived. `queryByText("Checked in")` null, `queryByText("Pending")` null, "Check in" button enabled.
  - `it("moves the arrival order out of the header")`: arrived with `arrival_order: 4`; `getAllByText(ordinal(4))` has length 1 inside the card.
  - `it("explains a blocked check-in with the unpaid line")`: unpaid normal guest. `getByText("Entrance fee not paid")` exists; the disabled "Check in" button's `aria-describedby` equals the id of the element whose text is "Entrance fee not paid".
  - Review Focus tests:
    - `it("shows no unpaid line while the meetup is loading")`: hold the meetup query pending (existing pattern in the file for loading states); `queryByText("Entrance fee not paid")` null; "Check in" disabled.
    - `it("keeps the paid line for a guest paid before becoming exempt")`: `guest_type: "INVITED"`, `has_paid: true`; "Paid" and "Undo payment" present, `queryByText("Exempt")` null.
    - `it("hides undo payment from non-admins")`: `mockRole = "MEMBER"` (or the file's non-admin role), paid guest; "Paid" present, "Undo payment" absent.
    - `it("leaves the order pill out when the arrival order is unknown")`: arrived with `arrival_order: null`; "Checked in" present, `queryByText(/^#/)` null in the card.
    - `it("keeps the unpaid line on a finalized meetup")`: update the existing "drops the steps band once the meetup is finalized" test to assert `getByText("Entrance fee not paid")` instead of "Payment pending".
  - Keep "renders one card per guest instead of the table" passing as is (it checks "Exempt" text, which the neutral line still renders).
- [ ] **Step 2:** `npx vitest run src/features/meetups/MeetupDetailPage.test.tsx -t "on phones"`, expect the new tests FAIL.
- [ ] **Step 3:** Implement the `GuestCard` prop change, `renderCardStatuses`, the `renderCheckIn` hint id, and update `renderCard` (drop `order`, `checkIn`, `payment`; pass `statuses`; pass `blockedHintId` to `renderCheckIn` only when the unpaid line renders). Update the `GuestCard` doc comment to describe header, status lines, steps.
- [ ] **Step 4:** Same command, expect PASS. Then the full gates: `npm run check`, `npm run test:run`, `npm run build`, all clean.
- [ ] **Step 5: Check it on a phone.** `npm run build && npm run preview`, open `/meetups/<id>` at 375px width in dark and light mode: no double rule between the amber line and the buttons, contrast of the tinted text at 4.5:1 or more, long names and dates wrap without overflow.
- [ ] **Step 6: Commit**
  ```bash
  git add src/features/meetups/GuestCard.tsx src/features/meetups/MeetupDetailPage.tsx src/features/meetups/MeetupDetailPage.test.tsx
  git commit -m "feat: show the guest card states as one tinted line each on phones"
  ```

### Task 3: Review

- [ ] Run `/code-review` over the branch diff (CLAUDE.md rule 6). Fix real findings, push back on wrong ones with a reason, re-run the gates.
