import { statsNoShowsKey } from "@/lib/queryKeys";
import type { StatsQuery } from "@/lib/statsQuery";
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
