import { statsOperationsKey } from "@/lib/queryKeys";
import type { StatsQuery } from "@/lib/statsQuery";
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
