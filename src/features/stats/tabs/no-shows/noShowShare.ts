import type { RateRow } from "./RateBars";

/**
 * What the breakdown cards show: each group's no-show rate, or its share of
 * all the no-shows.
 */
export const NO_SHOW_VIEWS = ["rate", "share"] as const;

export type NoShowView = (typeof NO_SHOW_VIEWS)[number];

/** One group of a no-show breakdown: who was expected and who did not come. */
export type NoShowGroup<K> = {
  key: K;
  expected: number;
  no_show: number;
  no_show_rate: number | null;
};

/**
 * Each group's share of all the no-shows of a breakdown, in input order. The
 * groups split the sign-ups between them, so the shares add up to one; with
 * no no-shows at all there is nothing to share and every value is null.
 */
export function noShowShares(groups: { no_show: number }[]): (number | null)[] {
  const total = groups.reduce((sum, g) => sum + g.no_show, 0);
  return groups.map((g) => (total === 0 ? null : g.no_show / total));
}

/**
 * The rows of a breakdown card in `view`: each group's rate or its share of
 * the no-shows, with the people the rate is computed from.
 */
export function noShowRateRows<K>(
  groups: NoShowGroup<K>[],
  label: (key: K) => string,
  view: NoShowView,
): RateRow[] {
  const shares = noShowShares(groups);
  return groups.map((g, i) => ({
    key: String(g.key),
    label: label(g.key),
    rate: view === "share" ? shares[i]! : g.no_show_rate,
    n: g.expected,
  }));
}
