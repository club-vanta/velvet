import type { ComponentType } from "react";
import type { TranslationKey } from "@/lib/i18n";
import { ArrivalsTab } from "./ArrivalsTab";
import { AttendanceTab } from "./AttendanceTab";
import { DemographicsTab } from "./DemographicsTab";
import { OperationsTab } from "./OperationsTab";
import { RetentionTab } from "./RetentionTab";
import type { StatsTabProps } from "./statsTab";
import { WeatherTab } from "./WeatherTab";

/** The stats tabs in display order: the one list the URL, triggers and panels follow. */
export const STATS_TABS = [
  { value: "attendance", label: "statsTabAttendance", Tab: AttendanceTab },
  { value: "arrivals", label: "statsTabArrivals", Tab: ArrivalsTab },
  {
    value: "demographics",
    label: "statsTabDemographics",
    Tab: DemographicsTab,
  },
  { value: "retention", label: "statsTabRetention", Tab: RetentionTab },
  { value: "operations", label: "statsTabOperations", Tab: OperationsTab },
  { value: "weather", label: "statsTabWeather", Tab: WeatherTab },
] as const satisfies readonly {
  value: string;
  label: TranslationKey;
  Tab: ComponentType<StatsTabProps>;
}[];

export type StatsTab = (typeof STATS_TABS)[number]["value"];

export function isStatsTab(value: string | null): value is StatsTab {
  return STATS_TABS.some((tab) => tab.value === value);
}
