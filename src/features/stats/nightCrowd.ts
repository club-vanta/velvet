import type { components } from "@/api/types";
import type { TranslationKey } from "@/lib/i18n";

type NightGuest = components["schemas"]["NightGuestPublic"];
type AfterwardsMeetup = components["schemas"]["AfterwardsMeetupPublic"];

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

export type ReturnPoint = {
  key: string;
  /** null for the night itself, the curve's starting point. */
  date: string | null;
  name: string | null;
  /** Share of the first-timers back by then, null without first-timers. */
  first: number | null;
  /** Share of those who already came back by then, null without them. */
  already: number | null;
};

/**
 * The share of the night's first-timers and of those who already came that
 * had come back by each later event, from zero on the night itself.
 */
export function returnCurve(
  afterwards: AfterwardsMeetup[],
  attendees: number,
  newGuests: number,
): ReturnPoint[] {
  const returning = attendees - newGuests;
  const share = (back: number, of: number) => (of === 0 ? null : back / of);
  return [
    {
      key: "night",
      date: null,
      name: null,
      first: share(0, newGuests),
      already: share(0, returning),
    },
    ...afterwards.map((m) => ({
      key: m.meetup_id,
      date: m.date,
      name: m.name,
      first: share(m.back_new, newGuests),
      already: share(m.back - m.back_new, returning),
    })),
  ];
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
