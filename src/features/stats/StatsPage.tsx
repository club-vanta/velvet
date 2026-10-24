import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
import { StatsFilterBar } from "./StatsFilterBar";
import { useStatsFilters, type StatsTab } from "./useStatsFilters";

export function StatsPage() {
  const { t } = useLanguage();
  const filters = useStatsFilters();

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
        <TabsList>
          <TabsTrigger value="attendance">
            {t("statsTabAttendance")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <div data-testid="attendance-tab" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
