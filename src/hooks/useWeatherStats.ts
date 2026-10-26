import { statsWeatherKey } from "@/lib/queryKeys";
import type { StatsQuery } from "@/lib/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** Weather against the attendance of finalized meetups, for the stats filters. */
export function useWeatherStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/weather",
    statsWeatherKey,
    orgId,
    query,
  );
}
