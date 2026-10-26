import type { components } from "@/api/types";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { signed } from "./statsFormat";

type ComparisonKind = components["schemas"]["StatsComparisonKind"];

/** The unit a change against the previous period is shown in. */
type ChangeUnit = "percent" | "points" | "minutes" | "years";

const VS_PREVIOUS: Record<ChangeUnit, TranslationKey> = {
  percent: "statsVsPrevious",
  points: "statsVsPreviousPts",
  minutes: "statsMinutesVsPrevious",
  years: "statsYearsVsPrevious",
};

/**
 * Builds the line under a headline number for a tab's comparison kind:
 * the signed change in `unit` against the previous period, or the period
 * `average` for one event. Undefined when the side it needs is missing, so
 * a number with no `average` shows no line for one event.
 */
export function useComparisonLine(kind: ComparisonKind | null) {
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
        : t("statsPeriodAverage").replace("{0}", average);
    }
    if (kind !== "PREVIOUS_PERIOD" || change === null) return undefined;
    const text = signed(change, lang);
    return t(VS_PREVIOUS[unit]).replace(
      "{0}",
      unit === "percent" ? `${text}%` : text,
    );
  };
}
