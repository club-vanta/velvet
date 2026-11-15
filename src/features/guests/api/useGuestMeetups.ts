import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { guestMeetupsKey } from "@/api/queryKeys";

/** The meetups of `orgId` a guest signed up for or walked into. */
export function useGuestMeetups(orgId: string, guestId: string) {
  return useQuery({
    queryKey: guestMeetupsKey(orgId, guestId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/guests/{guest_id}/meetups",
        { params: { path: { org_id: orgId, guest_id: guestId } } },
      );
      if (error) throw new Error("Failed to load guest meetups");
      return data;
    },
    // Without an active org there is nothing to scope the meetups to.
    enabled: !!orgId,
  });
}
