import { skipToken, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";
import { statsDemographicsKey } from "@/lib/queryKeys";
import type { StatsQuery } from "@/lib/statsQuery";

/**
 * Gender and age of the people who attend finalized meetups, for the stats
 * filters. `query` is null while the filters are not ready, which keeps the
 * request from firing and keys the query apart from every real filter.
 */
export function useDemographicsStats(orgId: string, query: StatsQuery | null) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: statsDemographicsKey(orgId, query),
    queryFn:
      orgId && query
        ? async () => {
            const { data, error } = await api.GET(
              "/organizations/{org_id}/stats/demographics",
              {
                params: {
                  path: { org_id: orgId },
                  query: {
                    from: query.from,
                    to: query.to,
                    meetup_id: query.meetupId,
                  },
                },
              },
            );
            if (error) throw new Error(t("failedLoadOrgStats"));
            return data;
          }
        : skipToken,
  });
}
