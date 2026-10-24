import { localDay } from "./statsPeriod";

/** Rates built from fewer people than this are shown dimmed with `n`. */
export const SMALL_SAMPLE = 10;

const NO_VALUE = "–";

export function formatRate(rate: number | null, locale: string): string {
  if (rate === null) return NO_VALUE;
  return `${new Intl.NumberFormat(locale).format(Math.round(rate * 100))}%`;
}

/** Whole percent change from `baseline` to `current`, or null when undefined. */
export function formatChange(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}

export function isSmallSample(n: number): boolean {
  return n < SMALL_SAMPLE;
}

/**
 * dd/mm of an event's local day. The API sends naive UTC datetimes (no
 * "Z"), which `new Date` would read as local time.
 */
export function formatEventDay(iso: string): string {
  const date = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`);
  const day = localDay(date);
  return `${day.slice(8)}/${day.slice(5, 7)}`;
}
