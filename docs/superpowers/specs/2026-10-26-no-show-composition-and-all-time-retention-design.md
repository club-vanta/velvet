# No-show composition and all-time retention

## Intent

Two gaps in `/stats` that the user hit while reading real data:

1. **No vinieron** shows each group's no-show rate ("52% of men's RSVPs did not come"). The user also wants the composition ("52% of the no-shows were men"), which answers a different question: who makes up the people who do not come.
2. **Fidelidad** with the "Desde siempre" period shows "Primera vez: 155, 100% del total". A first time is counted when it falls inside the period, and over all time every first time does, so the card always reads 100% and says nothing.

## Goals

- A "Tasa / Composición" selector on the No vinieron tab that switches every breakdown card at once.
- In composition mode each row shows the group's share of all no-shows in scope, and the shares of a card add up to 100%.
- With "Desde siempre", Fidelidad hides "Primera vez" and shows "Vinieron una sola vez" (people who came exactly once), next to "Volvieron".

## Non-goals

- No change to the rate math, or to any other tab.
- The per-event chart and the no-show guest list on No vinieron do not change.

## Approaches

**Composition**

1. **Compute it in velvet from the counts the API already sends (chosen).** Every group row carries `no_show`; a group's share is `no_show / sum(no_show)` over that card's rows. The groups of a card partition the RSVPs (including "Sin dato"), so the shares add up to 100%. A card has about 10 rows, so the cost is negligible even on a phone. The user asked for this to sit in the frontend unless it was heavy, and it is not.
2. The backend sends the share. Adds an API change for a division the client can do exactly.

**Vinieron una sola vez**

1. **The backend exposes the `came_back` count it already computes for the return rate (chosen; user left the call to Claude).** Velvet shows `attendees - came_back` under "Desde siempre". This follows the CLAUDE.md rule to fix the contract at the source.
2. Rebuild the count in velvet as `attendees × (1 - rate)` from the rounded rate. Fragile, and a reviewer would reject it.

## Design

### Backend (`alter-tracker-backend`, new branch from `main`)

- `RetentionSummaryPublic` gains `came_back: int`: the first-timers in scope who attended a later meetup of the org (the numerator of `first_timer_return_rate`, which keeps counting after the period ends).
- The comparison summary carries it too, since it is the same model.
- Regenerate `openapi.json`. Tests pin the value for a known fixture, including 0 when nobody came back.

### Velvet (new branch from `main`, after the backend merges)

- `npm run generate:api` for the new field.
- **No vinieron:** a two-option toggle ("Tasa" / "Composición", en "Rate" / "Share") above the breakdown cards (gender, age, visit history, lead time). It switches all four cards at once. The mode lives in the URL like the other stats filters, so a shared link keeps it.
  - Rate mode is today's view.
  - Composition mode: each row shows `no_show / total no_show` of that card, the column header reads "De los ausentes" ("Of no-shows"), and rows show no `n`, since the share is already an exact count. The bar track is still 0 to 100%.
  - With no no-shows at all in scope, every share is shown as a dash, not as 0%.
- **Fidelidad:** when the period preset is `all`, the "Primera vez" card is replaced by "Vinieron una sola vez" (`attendees - came_back`) with "X% del total". The note "Primera vez es el primer evento…" is hidden in that mode too, since the card it explains is gone.

## Calls made by Claude (user can override)

- The trigger is the "Desde siempre" preset, not "everyone is new": in a short period it can truly happen that everyone is new, and then 100% is real information.
- Composition rows are not dimmed for a small n. The dimming warns that a rate from few people is unreliable, while a share is an exact count of who did not come.
- The selector sits once above the breakdown cards instead of on each card, so the cards cannot end up in different modes.
- Spanish labels: "Tasa", "Composición", "De los ausentes", "Vinieron una sola vez".

## Left to the builder

- Exact toggle component (reuse the existing segmented control in `src/components/` if there is one).
- Tests: share math (sums to 100%, zero no-shows), the toggle switching all cards and persisting in the URL, the all-time Fidelidad card, and the backend `came_back` value.
