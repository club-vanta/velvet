import type { components } from "@/api/types";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { NamedPreset, StatsPeriodChoice } from "./statsPeriod";
import { formatFullDay, signed } from "./statsFormat";

type ComparisonKind = components["schemas"]["StatsComparisonKind"];

/** The unit a change against the previous period is shown in. */
type ChangeUnit = "percent" | "points" | "minutes" | "years";

const VS_PREVIOUS: Record<ChangeUnit, TranslationKey> = {
  percent: "statsVsPrevious",
  points: "statsVsPreviousPts",
  minutes: "statsMinutesVsPrevious",
  years: "statsYearsVsPrevious",
};

const ALL_EVENTS: Record<NamedPreset, TranslationKey> = {
  "30d": "statsAllEvents30d",
  "3m": "statsAllEvents3m",
  "12m": "statsAllEvents12m",
  ytd: "statsAllEventsYtd",
  all: "statsAllEventsEver",
};

/**
 * "En todos los eventos de este año: 32%": the number over every event of the
 * picked period, naming the period. Not "average": for most numbers it is a
 * rate, median, or percentile over all of them together.
 */
export function allEventsLine(
  period: StatsPeriodChoice,
  average: string,
  t: (key: TranslationKey) => string,
): string {
  if (period.preset !== "custom") {
    return t(ALL_EVENTS[period.preset]).replace("{0}", average);
  }
  return t("statsAllEventsCustom")
    .replace("{0}", average)
    .replace("{1}", formatFullDay(period.custom.from))
    .replace("{2}", formatFullDay(period.custom.to));
}

/**
 * Builds the line under a headline number for a tab's comparison kind:
 * the signed change in `unit` against the previous period, or the period
 * `average` for one event. Undefined when the side it needs is missing, so
 * a number with no `average` shows no line for one event.
 */
export function useComparisonLine(
  kind: ComparisonKind | null,
  period: StatsPeriodChoice,
) {
  const { t, lang } = useLanguage();
  return ({
    change,
    unit,
    average,
  }: {
    change: number | null;
    unit: ChangeUnit;
    average?: string;
  }): string | undefined => {
    if (kind === "PERIOD_AVERAGE") {
      return average === undefined
        ? undefined
        : allEventsLine(period, average, t);
    }
    if (kind !== "PREVIOUS_PERIOD" || change === null) return undefined;
    const text = signed(change, lang);
    return t(VS_PREVIOUS[unit]).replace(
      "{0}",
      unit === "percent" ? `${text}%` : text,
    );
  };
}
