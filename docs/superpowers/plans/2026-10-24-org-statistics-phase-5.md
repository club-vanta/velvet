# Organization Statistics, Phase 5 (Operación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Operación** tab: guest type mix, payments, check-ins per staff user, the busiest 15 minutes at the door, and bans, backed by `GET /organizations/{org_id}/stats/operations`.

**Architecture:** A new `app/services/stats/operations.py` with one grouped SQL query per section over the scope's finalized meetups (all guest types), plus a query on `event_log` for bans. Velvet adds `OperationsTab`.

**Tech Stack:** as phase 1.

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md`, "Operación".

## Global Constraints

- Phase 1-4 Global Constraints, except the audience rule: **this tab includes every guest type** (`NORMAL`, `INVITED`, `STAFF`, `VENDOR`).
- "Attended" = `has_arrived` true (status `ATTENDED` or `WALKIN` from `attendance_status_expr()`).
- **Guest types:** per type, `attended` and `share` of all attended (4 decimals); always all four types in the order NORMAL, INVITED, STAFF, VENDOR.
- **Payments:** only finalized meetups in scope with `requires_payment`. Over attended RSVPs, using the same rule as the existing door card (`get_meetup_stats` in `app/routers/meetups.py`): `NORMAL` + `has_paid` -> `paid`; `NORMAL` without -> `pending`; any other type -> `exempt`. Plus `cancelled_but_paid` (cancelled RSVPs with `has_paid`). `paid_share = paid / (paid + pending)`. `paying_events` = how many meetups counted. All null/zero when no paying meetup is in scope. Extract the NORMAL-pays rule into one shared place (a small function or SQL expression in `app/services/`) used by both the door card and this tab; do not write it twice.
- **Check-ins per staff user:** attended RSVPs grouped by `checked_in_by_id` -> `{user_id: int | None, username: str | None, checkins: int}`, sorted by checkins desc then username; `user_id` null (no recorded checker) last.
- **Busiest 15 minutes:** for each meetup, check-ins (`arrival_time` of attended RSVPs, all types) per local quarter hour (same flooring as phase 2's one-event clock buckets; reuse that helper). Report the single busiest `{meetup_id, meetup_name, local_time "HH:MM", checkins}` in scope (ties: earliest meetup, then earliest time) and `avg_peak_checkins` = average over meetups of each meetup's busiest bucket (1 decimal).
- **Bans:** `event_log` rows with `event_type = BAN` and `org_id` = org whose `timestamp` falls in the period (Buenos Aires local dates, same bounds as `StatsPeriod.utc_bounds()`); in one-event mode, rows with that `meetup_id` if the ban flow records it, else bans between the meetup start and 12 hours later (check `app/` for how BAN rows are written and document the choice). Report `bans` (count) and a list of up to 20 `{guest_id, displayname, reason, timestamp, actor_username}` newest first.
- Comparison (`OperationsSummary`): `attended`, `paid_share`, `avg_peak_checkins`, `bans`.

## Review Focus

1. **A period with no paying meetups** -> payments section hidden in velvet, not "0% pagó". Tests in Task 1 and Task 3.
2. **Check-ins recorded before `checked_in_by_id` existed** (null) -> one "Sin registro" row, not dropped. Test in Task 1.
3. **The door card's numbers and this tab's payments for the same meetup** -> same paid/pending split for attended NORMAL guests. Test in Task 1 (call both).
4. **A ban without a reason or whose actor user was deleted** -> still listed, with a dash. Test in Task 1.
5. **Staff and vendors** appear in this tab and still not in the others. Test in Task 1 (one STAFF attended appears in guest types and check-ins).

---

## Part A: Backend

### Task 1: Operations service (+ shared payment rule)

**Files:** create `app/services/stats/operations.py`; modify `app/routers/meetups.py` and/or a small module in `app/services/` for the shared payment rule; test `tests/test_stats_operations.py` (and keep `tests/test_meetups*.py` green).

**Interfaces (frozen dataclasses):** `GuestTypeRow(guest_type: GuestType, attended: int, share: float | None)`, `PaymentStats(paying_events: int, paid: int, pending: int, exempt: int, cancelled_but_paid: int, paid_share: float | None)`, `StaffCheckins(user_id: int | None, username: str | None, checkins: int)`, `BusiestSlot(meetup_id, meetup_name: str, local_time: str, checkins: int)`, `BanRow(guest_id, displayname: str, reason: str | None, timestamp: datetime, actor_username: str | None)`, `OperationsSummary(attended: int, paid_share: float | None, avg_peak_checkins: float | None, bans: int)`, `OperationsStats(summary, guest_types, payments: PaymentStats | None, staff: list[StaffCheckins], busiest: BusiestSlot | None, ban_list: list[BanRow], comparison_kind, comparison: OperationsSummary | None)`; `operations_stats(session, org_id, period, meetup_id) -> OperationsStats`.

- [ ] **Step 1: Failing tests** (exact values): guest-type mix with a STAFF attended; payments over two paying meetups and one free one (free one ignored); `payments is None` when no paying meetup; staff rows with a null checker last; busiest slot and avg peak across two meetups; bans in period with a null reason and a missing actor; door-card parity for one meetup; one-event and comparison tests.
- [ ] **Step 2:** fail. **Step 3:** implement. **Step 4:** pass (whole suite, the door card tests included). **Step 5: Commit** `feat: compute door operations stats for org meetups`

### Task 2: Operations endpoint

- `GET /organizations/{org_id}/stats/operations` via `stats_scope`, `OperationsStatsPublic` and nested schemas, consistent example, regenerated `openapi.json`.
- [ ] Tests: 401; 403 staff; 200 exact body; 200 with `meetup_id`; 404; 422; empty period. Full gate. **Commit** `feat: add the org operations stats endpoint`

---

## Part B: Velvet

### Task 3: Operación tab

**Files:** generated types; `statsOperationsKey`; `src/hooks/useOperationsStats.ts`; `src/features/stats/OperationsTab.tsx` + test; `StatsPage.tsx`, `useStatsFilters.ts` (`"operations"`), `i18n.tsx`.

- Headlines: Ingresaron (all types attended), Pagaron (`paid_share`, n = paid + pending; hidden without paying events), Pico en la puerta (`busiest.checkins` with subline `"{meetup_name} · {local_time}"` in aggregate, `local_time` for one event), Baneos (`bans`).
- Sections: Tipos de invitado (horizontal bars with shares, labels reuse the existing guest-type i18n keys via `src/lib/guestType.ts`), Pagos (paid / pending / exempt counts, cancelled-but-paid as a line under it; hidden when `payments` is null), Check-ins por persona del staff (list, null user -> "Sin registro"), Baneos (list with displayname linking to `/guests/{guest_id}`, reason or "–", date, actor or "–").
- Notes (`StatsNote`): `statsNoteOperations` en "This tab counts everyone who came in, staff and vendors included." / es "Esta pestaña cuenta a todos los que entraron, staff y vendors incluidos."; `statsNotePayments` en "Only events that charge entry. Pending means someone who came in without a recorded payment." / es "Solo los eventos que cobran entrada. Pendiente es alguien que entró sin un pago registrado.".
- Other i18n (en / es): `statsTabOperations` "Operations" / "Operación"; `statsCameIn` "Came in" / "Ingresaron"; `statsPaid` "Paid" / "Pagaron"; `statsDoorPeak` "Busiest 15 minutes" / "Pico en la puerta"; `statsBans` "Bans" / "Baneos"; `statsGuestTypes` "Guest types" / "Tipos de invitado"; `statsPayments` "Payments" / "Pagos"; `statsPaymentPaid` "Paid" / "Pagaron"; `statsPaymentPending` "Pending" / "Pendientes"; `statsPaymentExempt` "Exempt" / "Exentos"; `statsCancelledButPaid` "{0} cancelled after paying" / "{0} se bajaron después de pagar"; `statsStaffCheckins` "Check-ins per staff member" / "Check-ins por persona del staff"; `statsNoChecker` "Not recorded" / "Sin registro".
- [ ] Tests: loading, error, empty; exact headlines; payments hidden when null; "Sin registro" row; ban list with dashes and links; notes; query params. Gates. **Commit** `feat: add the Operación stats tab`

### Task 4: Gate and browser check

- [ ] All gates; browser check at 375px and 1280px, light and dark.
