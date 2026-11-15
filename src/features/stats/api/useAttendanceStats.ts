import { statsAttendanceKey } from "@/api/queryKeys";
import type { StatsQuery } from "@/api/statsQuery";
import { useOrgStatsQuery } from "./useOrgStats";

/** Attendance of finalized meetups, for the stats filters. */
export function useAttendanceStats(orgId: string, query: StatsQuery | null) {
  return useOrgStatsQuery(
    "/organizations/{org_id}/stats/attendance",
    statsAttendanceKey,
    orgId,
    query,
  );
}
