import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetupGuests } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { rsvpPath } from "./rsvpPath";

/** Adds a known guest who did not RSVP to the meetup's list. */
export function useAddWalkin(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestId: string) => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/add-walkin",
        { params: rsvpPath(orgId, meetupId, guestId) },
      );
      if (error) throw new Error(extractApiError(error, t("failedAddWalkin")));
      return data;
    },
    onSuccess: () => invalidateMeetupGuests(queryClient, orgId, meetupId),
  });
}
