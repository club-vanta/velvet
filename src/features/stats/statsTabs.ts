import type { ComponentType } from "react";
import type { TranslationKey } from "@/lib/i18n";
import { ArrivalsTab } from "./tabs/arrivals/ArrivalsTab";
import { AttendanceTab } from "./tabs/attendance/AttendanceTab";
import { DemographicsTab } from "./tabs/demographics/DemographicsTab";
import { NoShowsTab } from "./tabs/no-shows/NoShowsTab";
import { OperationsTab } from "./tabs/operations/OperationsTab";
import { RetentionTab } from "./tabs/retention/RetentionTab";
import type { StatsTabProps } from "./lib/statsTab";
import { WeatherTab } from "./tabs/weather/WeatherTab";

/** The stats tabs in display order: the one list the URL, triggers and panels follow. */
export const STATS_TABS = [
  { value: "attendance", label: "statsTabAttendance", Tab: AttendanceTab },
  { value: "no-shows", label: "statsTabNoShows", Tab: NoShowsTab },
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
