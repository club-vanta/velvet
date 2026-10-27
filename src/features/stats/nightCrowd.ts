import type { components } from "@/api/types";
import type { CSSProperties } from "react";
import type { TranslationKey } from "@/lib/i18n";
import { formatCount } from "./statsFormat";

type NightGuest = components["schemas"]["NightGuestPublic"];

/**
 * Which visit a night was for a person, in the same steps as the frequency
 * chart of the period view (1, 2, 3 to 5, 6 or more).
 */
export const VISIT_BANDS = ["first", "second", "few", "regular"] as const;

export type VisitBand = (typeof VISIT_BANDS)[number];

export function visitBand(visit: number): VisitBand {
  if (visit === 1) return "first";
  if (visit === 2) return "second";
  return visit <= 5 ? "few" : "regular";
}

// First-timers in the "new" colour of the period view, then one blue that
// deepens with the visits, so the eye reads newcomers against regulars.
const BAND_COLORS: Record<VisitBand, string> = {
  first: "var(--chart-1)",
  second: "color-mix(in oklab, var(--chart-2) 50%, var(--card))",
  few: "color-mix(in oklab, var(--chart-2) 75%, var(--card))",
  regular: "var(--chart-2)",
};

/** The band colour for Tailwind's arbitrary-value classes, set at runtime. */
export const bandStyle = (band: VisitBand): CSSProperties =>
  ({ "--band": BAND_COLORS[band] }) as CSSProperties;

/** Who came back looks vivid; who has not, faded. The ring keeps its colour. */
export const FADED = "opacity-50 grayscale";

/** "Primera vez" for a first visit, else "Visita 4". */
export function visitLabel(
  visit: number,
  t: (key: TranslationKey) => string,
  lang: string,
): string {
  return visit === 1
    ? t("statsBandFirst")
    : t("statsVisitNumber").replace("{0}", formatCount(visit, lang));
}

/** A regular is someone for whom the night was their 6th visit or later. */
export function isRegular(visit: number): boolean {
  return visitBand(visit) === "regular";
}

/** The night's guests by band, every band in order even when empty. */
export function groupByVisits(
  guests: NightGuest[],
): { band: VisitBand; guests: NightGuest[] }[] {
  return VISIT_BANDS.map((band) => ({
    band,
    guests: guests.filter((g) => visitBand(g.visit) === band),
  }));
}

const DAYS_IN_MONTH = 30.44;

/** Days between two visits in plain words: `28 días`, `3 meses`, `2 años`. */
export function formatGap(
  days: number,
  t: (key: TranslationKey) => string,
): string {
  if (days === 0) return t("statsGapSameDay");
  if (days < 60) {
    return t(days === 1 ? "statsGapDay" : "statsGapDays").replace(
      "{0}",
      String(days),
    );
  }
  if (days < 365) {
    return t("statsGapMonths").replace(
      "{0}",
      String(Math.round(days / DAYS_IN_MONTH)),
    );
  }
  const years = Math.floor(days / 365);
  return t(years === 1 ? "statsGapYear" : "statsGapYears").replace(
    "{0}",
    String(years),
  );
}
