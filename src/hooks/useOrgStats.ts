import { skipToken, useQuery, type QueryKey } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { paths } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import type { StatsQuery } from "@/lib/statsQuery";

/** Every org stats endpoint: they all take the same period filters. */
type OrgStatsPath = {
  [P in keyof paths]: P extends `/organizations/{org_id}/stats/${string}`
    ? P
    : never;
}[keyof paths];

type OrgStats<P extends OrgStatsPath> =
  paths[P]["get"]["responses"][200]["content"]["application/json"];

/**
 * One org stats endpoint for the stats filters. `query` is null while the
 * filters are not ready, which keeps the request from firing and keys the
 * query apart from every real filter.
 */
export function useOrgStatsQuery<P extends OrgStatsPath>(
  path: P,
  keyFn: (orgId: string, query: StatsQuery | null) => QueryKey,
  orgId: string,
  query: StatsQuery | null,
) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: keyFn(orgId, query),
    queryFn:
      orgId && query
        ? async (): Promise<OrgStats<P>> => {
            // openapi-fetch cannot check the init against a generic path.
            // Widening to the union checks it against every stats endpoint,
            // which all take the same params; the response is P's.
            const { data, error } = await api.GET(path as OrgStatsPath, {
              params: {
                path: { org_id: orgId },
                query: {
                  from: query.from,
                  to: query.to,
                  meetup_id: query.meetupId,
                },
              },
            });
            if (error) throw new Error(t("failedLoadOrgStats"));
            return data as OrgStats<P>;
          }
        : skipToken,
  });
}
