# CLAUDE.md - velvet (Alter Tracker Frontend)

Staff portal for Club Vanta's Alter meetups. See `README.md` for the stack and setup, and `../alter-tracker-backend/CLAUDE.md` for the API side.

---

## RULE: senior-PR quality bar

Every change has to be set up correctly, done efficiently, and modularized, and it has to pass a PR review from a senior engineer. "It works" is not enough.

What that means in practice:

1. **Follow the existing patterns.** Read the surrounding code first and match its structure, naming, and idioms. Feature code goes in `src/features/<feature>/`, shared UI in `src/components/`, and API types are generated (`npm run generate:api`), never written by hand.
2. **Keep it modular.** Small components and hooks with one job each. No copy-paste: extract what is shared. No dead code, debug logs, or leftover TODOs.
3. **Keep it efficient.** No unnecessary renders, requests, or recomputations on large lists (the guest list has 1000+ entries). Measure before and after when performance is the point of the change.
4. **Test it.** New logic gets tests, and bug fixes get a test that fails without the fix.
5. **Verify before calling it done.** Everything CI runs has to pass locally:

   ```bash
   npm run check     # typecheck + prettier + eslint
   npm run test:run
   npm run build
   ```

6. **Review non-trivial changes before the PR.** For anything beyond a small, mechanical change, run a review agent (for example `/code-review`) over the diff. It checks correctness, code quality, and architecture. Fix the real findings, push back on the wrong ones with a reason, and only then open the PR.

---

## Lessons from past reviews

Each item below was a real finding in an earlier PR. Check for them before asking for review.

### Data and cache

- **Invalidate everything a mutation touches.** Use the helpers in `src/lib/queryKeys.ts` (`invalidateMeetupGuests`, `invalidateGuestIdentity`, `invalidateAllGuestIdentities`), never inline query keys. A Mazmo sync once left guest names stale in other meetups' cached lists because only one key was invalidated.
- **Loading and error are not "no".** When UI depends on a query (for example ban status), gate it on the query succeeding. Treating `undefined` as "not banned" showed wrong actions while loading and caused backend 409s.
- **Hide actions the backend refuses.** If the API rejects an action for a state (ban or unlink a banned guest, edits on a finalized meetup), the UI must not offer it, or must disable it with a reachable explanation.
- **Fix the contract at the source.** Types come from `npm run generate:api`. If a field is always present but typed optional, fix the backend schema instead of adding `!` or fallbacks here.

### Components and routing

- **Reuse shared components** from `src/components/` (`GuestBadges`, `GuestAvatar`, `FactStrip`, `ListToolbar`) instead of reimplementing them.
- **Param routes reuse the component instance.** Navigating `/meetups/a` to `/meetups/b` keeps local state (open sheets, search). Key the page by the route param or reset that state, and add a test for it.
- **Phones first.** Check layouts at 375px. jsdom has no `matchMedia`, so `useMediaQuery` needs a stub in tests or the mobile branch is never tested.

### Text, i18n, and accessibility

- Every user-facing string goes in `src/lib/i18n.tsx` in both English and Spanish. Check that the Spanish copy means the same thing, not just that it exists.
- Split names into characters with `Array.from()`, not indexing, so emoji names do not break into lone surrogates.
- Search goes through `src/lib/searchText.ts` and sorting through `src/lib/sortNames.ts` (Spanish collation, so `Ñ` sorts after `N`). Do not write new normalization.
- Keep a correct heading hierarchy (h1, h2, h3), use `focus-visible` rings, and keep small text at 4.5:1 contrast or more.
- Do not explain a disabled control with `title` alone; keyboard and screen-reader users cannot reach it. Use `aria-describedby`. Do not put `aria-label` on elements that do not support it, such as a bare `<dl>`.

### Performance

- The React Compiler is on, so do not add `useMemo` or `useCallback` by default. Values that cross hook boundaries can still need a manual memo. Only keep one after measuring (4x CPU throttle on `/guests` with 1000+ guests) and add a comment saying why it is there.

### Tests

- Assert exact values, not substrings of glued `textContent`. Brittle matches broke on harmless markup changes.
- Mock every endpoint a new component calls, and cover the loading, error, and empty states, not just the happy path.
- Test fixtures must satisfy the full generated type. Do not cast partial objects.
