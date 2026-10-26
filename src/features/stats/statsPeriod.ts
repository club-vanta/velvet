import type { StatsQuery } from "@/lib/statsQuery";

export const PRESETS = ["30d", "3m", "12m", "ytd", "all", "custom"] as const;

export type RangePreset = (typeof PRESETS)[number];

/** A preset whose days follow from today, unlike "custom". */
export type NamedPreset = Exclude<RangePreset, "custom">;

export const DEFAULT_RANGE: NamedPreset = "3m";

/** The inclusive first and last day of a custom period (YYYY-MM-DD). */
export type CustomRange = { from: string; to: string };

/** The period the user picked, as the filters name it rather than as dates. */
export type StatsPeriodChoice =
  | { preset: NamedPreset }
  | { preset: "custom"; custom: CustomRange };

export function isRangePreset(value: string | null): value is RangePreset {
  return PRESETS.some((preset) => preset === value);
}

/**
 * The period in the `range`, `from` and `to` URL params. A missing, unknown,
 * or malformed range, or a custom one without two ordered days, is the
 * default.
 */
export function parsePeriod(
  range: string | null,
  from: string | null,
  to: string | null,
): StatsPeriodChoice {
  if (range === "custom") {
    return isValidDay(from) && isValidDay(to) && from <= to
      ? { preset: "custom", custom: { from, to } }
      : { preset: DEFAULT_RANGE };
  }
  return {
    preset: isRangePreset(range) && range !== "custom" ? range : DEFAULT_RANGE,
  };
}

/** True for a real calendar day written as YYYY-MM-DD. */
export function isValidDay(value: string | null): value is string {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return formatDay(parseDay(value)) === value;
}

/** A date's calendar day in browser local time, as YYYY-MM-DD. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDay(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDay(date);
}

/** Subtracts calendar months, clamping to the last day of shorter months. */
function subtractMonths(day: string, months: number): string {
  const date = parseDay(day);
  const dayOfMonth = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(dayOfMonth, lastDay));
  return formatDay(date);
}

/** Resolves a preset to an inclusive `from` and exclusive `to` (YYYY-MM-DD). */
export function resolveRange(
  preset: RangePreset,
  today: string,
  custom?: CustomRange,
): Pick<StatsQuery, "from" | "to"> {
  switch (preset) {
    case "all":
      return {};
    case "custom":
      return custom ? { from: custom.from, to: addDays(custom.to, 1) } : {};
    case "30d":
      // 30 days counting today.
      return { from: addDays(today, -29), to: addDays(today, 1) };
    case "3m":
      return { from: subtractMonths(today, 3), to: addDays(today, 1) };
    case "12m":
      return { from: subtractMonths(today, 12), to: addDays(today, 1) };
    case "ytd":
      return { from: `${today.slice(0, 4)}-01-01`, to: addDays(today, 1) };
  }
}
