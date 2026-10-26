import { parseApiDateTime } from "@/lib/apiDateTime";
import { formatDecimal } from "@/lib/format";
import { localDay } from "./statsPeriod";

/** Rates built from fewer people than this are shown dimmed with `n`. */
const SMALL_SAMPLE = 10;

export const NO_VALUE = "–";

export function formatRate(rate: number | null, locale: string): string {
  if (rate === null) return NO_VALUE;
  return `${new Intl.NumberFormat(locale).format(Math.round(rate * 100))}%`;
}

/** Whole percent change from `baseline` to `current`, or null when undefined. */
export function percentChange(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return Math.round(((current - baseline) / baseline) * 100) || 0;
}

/** Whole percentage-point change between two rates, or null when either is missing. */
export function pointChange(
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

/**
 * A copy of `items` in date order. Charts of per-event data sort on the
 * client too, so they never depend on the order the API sends.
 */
export function sortByDate<T extends { date: string }>(items: T[]): T[] {
  return items
    .map((item) => ({ item, time: parseApiDateTime(item.date).getTime() }))
    .sort((a, b) => a.time - b.time)
    .map(({ item }) => item);
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
export function minuteChange(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null) return null;
  return Math.round(current - baseline) || 0;
}

/** The x-axis label of an arrival bucket: clock time for one event, else the offset from the start. */
export function formatCurveLabel(
  bucket: { start_minute: number; local_time: string | null },
  single: boolean,
): string {
  return (
    (single ? bucket.local_time : null) ?? formatOffset(bucket.start_minute)
  );
}

/** Difference in years rounded to one decimal, or null when either side is missing. */
export function yearsChange(
  current: number | null,
  baseline: number | null,
): number | null {
  if (current === null || baseline === null) return null;
  return Math.round((current - baseline) * 10) / 10 || 0;
}

/** A change with its sign, such as `+8`, `-3` or `0`, and one decimal at most (`+1,5`). */
export function signed(n: number, locale: string): string {
  const value = n || 0;
  const text = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value);
  return value > 0 ? `+${text}` : text;
}

/** An age in years with one decimal. */
export function formatAge(age: number | null, locale: string): string {
  if (age === null) return NO_VALUE;
  return formatDecimal(age, locale);
}

/**
 * Round ticks for an axis of shares: every 10 points up to half, every 20
 * beyond, ending at the first tick at or above `max`.
 */
export function shareTicks(max: number): number[] {
  const step = max <= 0.5 ? 10 : 20;
  const top = Math.max(
    step,
    Math.ceil(Math.round(max * 1000) / 10 / step) * step,
  );
  return Array.from({ length: top / step + 1 }, (_, i) => (i * step) / 100);
}

/** The 15 minutes a clock-time bucket covers, as `23:30-23:45`. */
export function formatClockWindow(start: string): string {
  const [hours, minutes] = start.split(":").map(Number);
  const end = (hours * 60 + minutes + 15) % (24 * 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${start}-${pad(Math.floor(end / 60))}:${pad(end % 60)}`;
}

/** A cohort month (`2026-01`) as a short month and year, such as `ene 2026`. */
export function formatCohortMonth(month: string, locale: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}
