import { statsRetentionKey } from "@/lib/queryKeys";
import type { StatsQuery } from "@/lib/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** New and returning guests of finalized meetups, for the stats filters. */
export function useRetentionStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/retention",
    statsRetentionKey,
    orgId,
    query,
  );
}
