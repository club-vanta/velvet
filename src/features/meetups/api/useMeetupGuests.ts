import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { meetupGuestsKey } from "@/api/queryKeys";
import { DOOR_REFRESH_MS } from "@/domain/meetup";
import { useLanguage } from "@/lib/i18n";

/** A meetup's guest list with each RSVP, kept fresh while the door is open. */
export function useMeetupGuests(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: meetupGuestsKey(orgId, meetupId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/{meetup_id}/guests",
        { params: { path: { org_id: orgId, meetup_id: meetupId } } },
      );
      if (error) throw new Error(t("failedLoadGuestList"));
      return data;
    },
    enabled: !!orgId && !!meetupId,
    refetchInterval: DOOR_REFRESH_MS,
  });
}
