import { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
import { useOrg } from "@/lib/org";
import { StatsErrorState } from "./StatsErrorState";
import { StatsFilterBar } from "./StatsFilterBar";
import type { StatsTabProps } from "./statsTab";
import { STATS_TABS, type StatsTab } from "./statsTabs";
import { useStatsFilters } from "./useStatsFilters";

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
          {STATS_TABS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {t(label)}
            </TabsTrigger>
          ))}
        </TabsList>
        {STATS_TABS.map(({ value, Tab }) => (
          <TabsContent key={value} value={value}>
            {eventsError || <Tab {...tabProps} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
