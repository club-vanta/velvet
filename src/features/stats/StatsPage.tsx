import { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
import { useOrg } from "@/lib/org";
import { ArrivalsTab } from "./ArrivalsTab";
import { AttendanceTab } from "./AttendanceTab";
import { DemographicsTab } from "./DemographicsTab";
import { OperationsTab } from "./OperationsTab";
import { RetentionTab } from "./RetentionTab";
import { StatsErrorState } from "./StatsErrorState";
import { StatsFilterBar } from "./StatsFilterBar";
import { WeatherTab } from "./WeatherTab";
import type { StatsTabProps } from "./statsTab";
import { useStatsFilters, type StatsTab } from "./useStatsFilters";

export function StatsPage() {
  const { t } = useLanguage();
  const { activeOrg } = useOrg();
  const filters = useStatsFilters();
  const tabListRef = useRef<HTMLDivElement>(null);

  // On a phone the strip scrolls sideways; keep the selected tab visible. The
  // scroll waits for the next frame, when the strip has its final layout.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      tabListRef.current
        ?.querySelector('[role="tab"][aria-selected="true"]')
        ?.scrollIntoView({ inline: "nearest", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [filters.tab]);
  const tabProps: StatsTabProps = {
    orgId: activeOrg?.org_id ?? "",
    query: filters.query,
    onShowAll: () => filters.setMeetupId(undefined),
  };
  // Without the events, a selected event cannot be checked, so no tab can
  // load; the error offers a retry or all events.
  const eventsError = filters.eventsFailed && (
    <StatsErrorState
      onRetry={filters.retryEvents}
      onShowAll={tabProps.onShowAll}
    />
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("statsTitle")}
      </h1>
      <StatsFilterBar filters={filters} />
      <Tabs
        value={filters.tab}
        onValueChange={(v) => filters.setTab(v as StatsTab)}
      >
        <TabsList
          ref={tabListRef}
          className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsTrigger value="attendance">
            {t("statsTabAttendance")}
          </TabsTrigger>
          <TabsTrigger value="arrivals">{t("statsTabArrivals")}</TabsTrigger>
          <TabsTrigger value="demographics">
            {t("statsTabDemographics")}
          </TabsTrigger>
          <TabsTrigger value="retention">{t("statsTabRetention")}</TabsTrigger>
          <TabsTrigger value="operations">
            {t("statsTabOperations")}
          </TabsTrigger>
          <TabsTrigger value="weather">{t("statsTabWeather")}</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          {eventsError || <AttendanceTab {...tabProps} />}
        </TabsContent>
        <TabsContent value="arrivals">
          {eventsError || <ArrivalsTab {...tabProps} />}
        </TabsContent>
        <TabsContent value="demographics">
          {eventsError || <DemographicsTab {...tabProps} />}
        </TabsContent>
        <TabsContent value="retention">
          {eventsError || <RetentionTab {...tabProps} />}
        </TabsContent>
        <TabsContent value="operations">
          {eventsError || <OperationsTab {...tabProps} />}
        </TabsContent>
        <TabsContent value="weather">
          {eventsError || <WeatherTab {...tabProps} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
