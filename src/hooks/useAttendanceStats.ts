import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { StatsQuery } from "@/features/stats/statsPeriod";
import { useLanguage } from "@/lib/i18n";
import { statsAttendanceKey } from "@/lib/queryKeys";

/**
 * Attendance of finalized meetups for the stats filters. `query` is null
 * while the filters are not ready, which keeps the request from firing.
 */
export function useAttendanceStats(orgId: string, query: StatsQuery | null) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: statsAttendanceKey(orgId, query ?? {}),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/stats/attendance",
        {
          params: {
            path: { org_id: orgId },
            query: {
              from: query?.from,
              to: query?.to,
              meetup_id: query?.meetupId,
            },
          },
        },
      );
      if (error) throw new Error(t("failedLoadOrgStats"));
      return data;
    },
    enabled: !!orgId && query !== null,
  });
}
