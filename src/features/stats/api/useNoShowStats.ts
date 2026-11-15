import { statsNoShowsKey } from "@/api/queryKeys";
import type { StatsQuery } from "@/api/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** Who signs up for finalized meetups and does not come, for the stats filters. */
export function useNoShowStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/no-shows",
    statsNoShowsKey,
    orgId,
    query,
  );
}
