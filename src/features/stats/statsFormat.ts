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
