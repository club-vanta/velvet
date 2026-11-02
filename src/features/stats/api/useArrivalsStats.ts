import { statsArrivalsKey } from "@/api/queryKeys";
import type { StatsQuery } from "@/api/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** When guests of finalized meetups arrive and how early they signed up, for the stats filters. */
export function useArrivalsStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/arrivals",
    statsArrivalsKey,
    orgId,
    query,
  );
}
