/**
 * The arrival curve by the local clock, summed over the meetups, or by the
 * time from each meetup's start, which lines up meetups that start at
 * different hours.
 */
export const CURVE_VIEWS = ["clock", "offset"] as const;

export type CurveView = (typeof CURVE_VIEWS)[number];
