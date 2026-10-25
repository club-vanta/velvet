import { statsDemographicsKey } from "@/lib/queryKeys";
import type { StatsQuery } from "@/lib/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** Gender and age of the people who attend finalized meetups, for the stats filters. */
export function useDemographicsStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/demographics",
    statsDemographicsKey,
    orgId,
    query,
  );
}
