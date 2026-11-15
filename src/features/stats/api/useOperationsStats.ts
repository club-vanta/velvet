import { statsOperationsKey } from "@/api/queryKeys";
import type { StatsQuery } from "@/api/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** Door operations of finalized meetups, for the stats filters. */
export function useOperationsStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/operations",
    statsOperationsKey,
    orgId,
    query,
  );
}
