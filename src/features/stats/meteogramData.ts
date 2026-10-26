import type { components } from "@/api/types";

type Hour = components["schemas"]["WeatherHourPublic"];
type Bucket = components["schemas"]["ArrivalBucketPublic"];

/** Minutes from the meetup start, as [first, last) of the chart's shared x axis. */
export type Domain = [number, number];

const HOUR = 60;
const QUARTER = 15;

/**
 * The chart follows the stored hours, from the start of the first to the end
 * of the last, so a start at half past shows whole hours. Callers pass at
 * least one hour.
 */
export function meteogramDomain(hours: Hour[]): Domain {
  return [hours[0]!.offset_minutes, hours.at(-1)!.offset_minutes + HOUR];
}

/** The arrival buckets that start inside the domain; the curve reaches further than the weather. */
export function arrivalsInDomain(
  curve: Bucket[],
  [from, to]: Domain,
): Bucket[] {
  return curve.filter((b) => b.start_minute >= from && b.start_minute < to);
}

export type HourRow = Hour & {
  /** Arrivals in the hour's four quarter hours, null without an arrival curve. */
  arrivals: number | null;
};

/** One row per hour for the chart's text table. */
export function hourRows(hours: Hour[], curve: Bucket[] | null): HourRow[] {
  return hours.map((h) => ({
    ...h,
    arrivals:
      curve === null
        ? null
        : curve
            .filter(
              (b) =>
                b.start_minute >= h.offset_minutes &&
                b.start_minute < h.offset_minutes + HOUR,
            )
            .reduce((sum, b) => sum + b.arrivals, 0),
  }));
}

/** Where a quarter hour bucket sits on the x axis: its middle. */
export const bucketCenter = (b: Bucket) => b.start_minute + QUARTER / 2;

/** Where an hour sits on the x axis: its middle. */
export const hourCenter = (h: Hour) => h.offset_minutes + HOUR / 2;
