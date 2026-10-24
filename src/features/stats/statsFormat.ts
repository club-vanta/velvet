import { parseApiDateTime } from "@/lib/apiDateTime";
import { localDay } from "./statsPeriod";

/** Rates built from fewer people than this are shown dimmed with `n`. */
export const SMALL_SAMPLE = 10;

export const NO_VALUE = "–";

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
  return Math.round(((current - baseline) / baseline) * 100) || 0;
}

/** Whole percentage-point change between two rates, or null when either is missing. */
export function formatPointChange(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null) return null;
  return Math.round((current - baseline) * 100) || 0;
}

export function formatCount(value: number | null, locale: string): string {
  if (value === null) return NO_VALUE;
  return new Intl.NumberFormat(locale).format(value);
}

export function isSmallSample(n: number): boolean {
  return n < SMALL_SAMPLE;
}

/** dd/mm of an event's local day, or dd/mm/yy with `withYear`. */
export function formatEventDay(iso: string, withYear = false): string {
  const day = localDay(parseApiDateTime(iso));
  const dayMonth = `${day.slice(8)}/${day.slice(5, 7)}`;
  return withYear ? `${dayMonth}/${day.slice(2, 4)}` : dayMonth;
}

/** Whether the events fall on local days of more than one calendar year. */
export function spansYears(isos: string[]): boolean {
  const years = new Set(
    isos.map((iso) => localDay(parseApiDateTime(iso)).slice(0, 4)),
  );
  return years.size > 1;
}

/** Minutes from an event's start as `+1:15` or `-0:10`. */
export function formatOffset(minutes: number): string {
  const whole = Math.round(minutes);
  const abs = Math.abs(whole);
  const sign = whole < 0 ? "-" : "+";
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

/** Whole-minute difference between two offsets, or null when either is missing. */
export function formatMinuteChange(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null) return null;
  return Math.round(current - baseline) || 0;
}
