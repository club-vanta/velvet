import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { meetupKey } from "@/api/queryKeys";
import { DOOR_REFRESH_MS } from "@/domain/meetup";
import { useLanguage } from "@/lib/i18n";

/** One meetup of the org, kept fresh while the door is open. */
export function useMeetup(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: meetupKey(orgId, meetupId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/{meetup_id}",
        { params: { path: { org_id: orgId, meetup_id: meetupId } } },
      );
      if (error) throw new Error(t("failedLoadMeetup"));
      return data;
    },
    enabled: !!orgId && !!meetupId,
    refetchInterval: DOOR_REFRESH_MS,
  });
}
