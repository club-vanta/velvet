/**
 * Each group's share of all the no-shows of a breakdown, in input order. The
 * groups split the sign-ups between them, so the shares add up to one; with
 * no no-shows at all there is nothing to share and every value is null.
 */
export function noShowShares(groups: { no_show: number }[]): (number | null)[] {
  const total = groups.reduce((sum, g) => sum + g.no_show, 0);
  return groups.map((g) => (total === 0 ? null : g.no_show / total));
}
