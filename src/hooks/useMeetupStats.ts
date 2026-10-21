import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";
import { meetupStatsKey } from "@/lib/queryKeys";

/**
 * A meetup's stats, refreshed every 30s so counts keep up with check-ins
 * made from other devices at the door.
 */
export function useMeetupStats(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: meetupStatsKey(orgId, meetupId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/{meetup_id}/stats",
        { params: { path: { org_id: orgId, meetup_id: meetupId } } },
      );
      if (error) throw new Error(t("failedLoadStats"));
      return data;
    },
    enabled: !!orgId && !!meetupId,
    refetchInterval: 30_000,
  });
}
