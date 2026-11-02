/**
 * Shared bar marks for the stats charts: the data end of a bar is rounded and
 * its baseline end stays square, and a card-coloured outline leaves a small
 * gap between neighbouring fills (stacked segments and adjacent bars alike).
 */
type Radius = [number, number, number, number];

/** A bar growing upward. */
export const BAR_END_UP: Radius = [4, 4, 0, 0];

/** A bar growing to the right. */
export const BAR_END_RIGHT: Radius = [0, 4, 4, 0];

export const BAR_GAP = { stroke: "var(--card)", strokeWidth: 2 } as const;
