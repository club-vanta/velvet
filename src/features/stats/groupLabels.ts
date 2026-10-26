import type { components } from "@/api/types";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { MAZMO_GENDER_LABEL, mazmoLabel } from "@/lib/mazmoProfile";

type AgeBucket = components["schemas"]["StatsAgeBucket"];
type LeadTimeBucket = components["schemas"]["StatsLeadTimeBucket"];
type VisitHistory = components["schemas"]["StatsVisitHistory"];

const AGE_LABELS: Record<AgeBucket, TranslationKey> = {
  AGE_18_24: "statsAge18to24",
  AGE_25_29: "statsAge25to29",
  AGE_30_34: "statsAge30to34",
  AGE_35_39: "statsAge35to39",
  AGE_40_49: "statsAge40to49",
  AGE_50_PLUS: "statsAge50Plus",
  UNKNOWN: "statsUnknown",
};

const LEAD_LABELS: Record<LeadTimeBucket, TranslationKey> = {
  SAME_DAY: "statsLeadSameDay",
  ONE_DAY: "statsLeadOneDay",
  TWO_THREE: "statsLeadTwoThree",
  FOUR_SEVEN: "statsLeadFourSeven",
  EIGHT_FOURTEEN: "statsLeadEightFourteen",
  FIFTEEN_PLUS: "statsLeadFifteenPlus",
};

const HISTORY_LABELS: Record<VisitHistory, TranslationKey> = {
  FIRST_TIME: "statsFirstTime",
  RETURNING: "statsHadComeBefore",
};

/** The display names of the groups the stats split people into. */
export function useGroupLabels() {
  const { t } = useLanguage();
  return {
    /** A Mazmo gender code; null is unknown, and an unknown code shows raw. */
    gender: (key: string | null) =>
      key === null ? t("statsUnknown") : mazmoLabel(MAZMO_GENDER_LABEL, key, t),
    age: (key: AgeBucket) => t(AGE_LABELS[key]),
    leadTime: (key: LeadTimeBucket) => t(LEAD_LABELS[key]),
    history: (key: VisitHistory) => t(HISTORY_LABELS[key]),
  };
}
