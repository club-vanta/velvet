import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetupGuests } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { rsvpPath } from "./rsvpPath";

/** Checks a guest in; the answer carries their arrival order. */
export function useCheckInGuest(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestId: string) => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/checkin",
        { params: rsvpPath(orgId, meetupId, guestId) },
      );
      if (error || !data)
        throw new Error(extractApiError(error, t("failedCheckIn")));
      return data;
    },
    onSuccess: () => invalidateMeetupGuests(queryClient, orgId, meetupId),
  });
}
