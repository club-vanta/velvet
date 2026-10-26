# No-show composition and all-time retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tasa / Composición" toggle to the No vinieron breakdown cards, and replace the tautological "Primera vez" card with "Vinieron una sola vez" when Fidelidad covers all time.

**Architecture:** The backend exposes the `came_back` count it already computes in `_summary` (`alter-tracker-backend/app/services/stats/retention.py:174`). Velvet computes composition shares client-side from each group's `no_show`, keeps the toggle in the URL, and switches the Fidelidad headline on an all-time query.

**Tech Stack:** FastAPI + SQLModel + pytest (backend); React 19 + React Compiler, react-router search params, Vitest (velvet).

**Spec:** `docs/superpowers/specs/2026-10-26-no-show-composition-and-all-time-retention-design.md` (velvet repo)

## Global Constraints

- Two PRs, each from its repo's `main`: backend `feat/retention-came-back` first, velvet `feat/no-show-composition` second.
- Velvet API types come from `npm run generate:api`, which reads the backend's `main`. Until the backend merges, generate from the local file with the same command pointed at `../alter-tracker-backend/openapi.json`, then rerun the real script after the merge (the output must be identical).
- Every new string in `src/lib/i18n.tsx` in en and es. No `useMemo`/`useCallback`. No em dashes.
- Gates: backend `run-tests`, `basedpyright`, `ruff check .`, `ruff format --check .`, `openapi.json` regenerated. Velvet `npm run check`, `npm run test:run`, `npm run build`.

## Review Focus

1. Zero no-shows in scope: every share is `null` (shown as a dash), never NaN or 0%.
2. The "Sin dato" (null key) group counts toward the total, so a card's shares still sum to 100%.
3. A one-event query under "Desde siempre" (`meetupId` set, no `from`/`to`) keeps "Primera vez": the swap only applies to all time with no event.
4. Unknown `noshow_view` URL values fall back to rate mode.
5. The comparison summary (`comparison` in the retention response) also carries `came_back`, so its schema validates.

Each has a test in the task that owns it.

---

### Task 1 (backend): expose `came_back`

**Files:**

- Modify: `app/services/stats/retention.py` (`RetentionSummary`, `_summary`)
- Modify: `app/schemas/stats.py` (`RetentionSummaryPublic`)
- Modify: `tests/test_stats_retention.py`, `app/openapi_examples/stats_examples.py`, `openapi.json`

**Interfaces:**

- Produces: `RetentionSummary.came_back: int` and `RetentionSummaryPublic.came_back: int`, placed after `new_guests`. Meaning: first-timers in scope who attended a later meetup of the org, counting past the period's end (the numerator of `first_timer_return_rate`).

- [ ] **Step 1:** Branch `git checkout -b feat/retention-came-back` from `main`. In `tests/test_stats_retention.py`, add `came_back=` to every `RetentionSummary(...)` expectation (lines ~96, 207, 221, 420, 426, 452), with values equal to `first_timer_return_rate × new_guests` (0, 0, 1, 1, 2, 1). Add `"came_back": 0` to the two JSON expectations (~565, ~591). Add `test_retention_came_back_counts_returns_after_the_period` next to `test_retention_first_timer_return_rate_looks_past_the_period` (line ~152), reusing its fixture: assert `stats.summary.came_back == 1`.
- [ ] **Step 2:** `devenv shell -- run-tests tests/test_stats_retention.py -q`, expect FAIL (`unexpected keyword argument 'came_back'`).
- [ ] **Step 3:** Add the field to `RetentionSummary` and `RetentionSummaryPublic` (docstring line: "came_back is how many of the new guests attended again later, even after the period ends"), set `came_back=came_back` in `_summary`, add it to the retention example in `stats_examples.py`, regenerate `openapi.json` with `uv run python scripts/generate_openapi.py`.
- [ ] **Step 4:** Run all backend gates. Expected: every test passes, basedpyright 0 errors, ruff clean, `openapi.json` contains `came_back`.
- [ ] **Step 5:** Commit `feat: expose how many first-timers came back in the retention summary`, push, open the PR. **Stop: the user merges it** before Task 3's final type regeneration.

### Task 2 (velvet): composition toggle on No vinieron

**Files:**

- Create: `src/features/stats/noShowShare.ts`, `src/features/stats/noShowShare.test.ts`
- Modify: `src/features/stats/RateBars.tsx`, `src/features/stats/NoShowsTab.tsx`, `src/features/stats/NoShowsTab.test.tsx`, `src/lib/i18n.tsx`

**Interfaces:**

- `noShowShares(groups: { no_show: number }[]): (number | null)[]` in `noShowShare.ts`: `no_show / total` per group, in input order, all `null` when the total is 0. Unrounded (formatting rounds).
- `RateBars` gains `dimSmallSamples?: boolean` (default `true`). When `false`, no row is dimmed and no `n` line is shown.
- `NoShowsTab` reads `noshow_view` from the URL: `"share"` means composition, anything else (absent, unknown) means rate. Picking "Tasa" deletes the param; picking "Composición" sets it to `share`. Both use `setSearchParams` with a new history entry, like `useStatsFilters.update`.
- Toggle markup: a `div role="group"` with `aria-label={t("statsNoShowView")}` holding two `Button size="sm"`s with `aria-pressed`; the pressed one uses `variant="secondary"`, the other `variant="ghost"`. Placed right above the breakdown grid.
- i18n (en / es): `statsNoShowView` "Show" / "Mostrar"; `statsViewRate` "Rate" / "Tasa"; `statsViewShare` "Share" / "Composición"; `statsShareOfNoShows` "Of no-shows" / "De los ausentes".

- [ ] **Step 1:** Write `noShowShare.test.ts`: `it("splits the no-shows by group")` `[{no_show:2},{no_show:1},{no_show:1}]` → `[0.5, 0.25, 0.25]`; `it("adds up to one")` sums to `1` for `[3,7,0]` (`toBeCloseTo(1)`); `it("has no share without no-shows")` `[0,0]` → `[null, null]`. The null-key group is covered in Step 3, where the gender fixture includes a `key: null` row and the card's shares must include it.
- [ ] **Step 2:** `npx vitest run src/features/stats/noShowShare.test.ts`, expect FAIL (module not found). Implement, expect PASS.
- [ ] **Step 3:** In `NoShowsTab.test.tsx` add: `it("shows each group's rate by default")` (existing gender rows' rates, header "No-show rate"); `it("switches every breakdown card to the share of no-shows")`: click "Share", then every card header reads "Of no-shows", the gender card shows exact shares computed from the fixture's `no_show`, and "Rate" has `aria-pressed="false"`; `it("keeps the view in the URL")`: render at `?noshow_view=share` and assert share mode; `it("falls back to rates for an unknown view")` at `?noshow_view=bogus`; `it("does not dim small groups in share mode")`: a group with a small `expected` shows no `n =` text in share mode. Fixtures must satisfy the generated types.
- [ ] **Step 4:** `npx vitest run src/features/stats/NoShowsTab.test.tsx`, expect the new tests FAIL.
- [ ] **Step 5:** Implement: `dimSmallSamples` in `RateBars`; `RateCard` takes `rateHeader` and `dimSmallSamples`; `rateRows` takes the mode and, in share mode, maps `rate` from `noShowShares` over the same groups (lead time uses `no_show` from its rows); the toggle; the strings.
- [ ] **Step 6:** Same command, expect PASS; then `npm run check`.
- [ ] **Step 7:** Commit `feat: show who makes up the no-shows next to each group's rate`.

### Task 3 (velvet): "Vinieron una sola vez" for all time

**Files:**

- Modify: `src/api/types.ts` (generated), `src/features/stats/RetentionTab.tsx`, `src/features/stats/RetentionTab.test.tsx`, `src/lib/i18n.tsx`, every test fixture of `RetentionSummaryPublic` (add `came_back`)

**Interfaces:**

- Consumes: `RetentionSummaryPublic.came_back` from Task 1.
- `RetentionTab` passes `allTime = !query?.meetupId && !query?.from && !query?.to` to `RetentionContent`.
- i18n (en / es): `statsCameOnce` "Came only once" / "Vinieron una sola vez".

- [ ] **Step 1:** Generate types from the local backend file (Global Constraints), and add `came_back` to every retention fixture so `npm run typecheck` passes.
- [ ] **Step 2:** In `RetentionTab.test.tsx` add: `it("shows who came only once instead of first times over all time")`: query `{}`, fixture `attendees: 155, new_guests: 155, came_back: 50`; assert "Came only once" with value `105` and subline "68% of total" (format via the same helper the card uses), no "First time" card, and the `statsNoteRetention` note absent; `it("keeps first times for one event over all time")`: query `{ meetupId }`, "First time" present; `it("keeps first times for a bounded period")`: query with `from`/`to`, "First time" present.
- [ ] **Step 3:** `npx vitest run src/features/stats/RetentionTab.test.tsx`, expect the first new test FAIL.
- [ ] **Step 4:** Implement: in `allTime` mode the second headline is `statsCameOnce` with `attendees - came_back` and `statsShareOfTotal` of `(attendees - came_back) / attendees`, and the `statsNoteRetention` note is not rendered. Add the string.
- [ ] **Step 5:** Same command, expect PASS. After the backend PR merges, run `npm run generate:api` and confirm `git diff src/api/types.ts` is empty.
- [ ] **Step 6:** Full velvet gates, then commit `feat: show who came only once when retention covers all time`.

### Task 4: review and PR

- [ ] Run a fresh review agent over the velvet branch diff and the backend PR diff (CLAUDE.md rule 6). Fix real findings with a failing test first, rerun the gates.
- [ ] Check at 375px in the running local app (`localhost:5200`): toggle wraps cleanly, both modes readable.
- [ ] Push and open the velvet PR, noting it depends on the backend PR.
