import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import {
  invalidateAllGuestIdentities,
  invalidateMeetupGuests,
} from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

/**
 * Loads the meetup's RSVPs from Mazmo. A sync also refreshes the names and
 * Mazmo profiles of every synced guest, so every guest identity is refreshed.
 */
export function useSyncMeetup(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/sync",
        { params: { path: { org_id: orgId, meetup_id: meetupId } } },
      );
      if (error || !data)
        throw new Error(extractApiError(error, t("failedSync")));
      return data;
    },
    onSuccess: () => {
      invalidateMeetupGuests(queryClient, orgId, meetupId);
      invalidateAllGuestIdentities(queryClient);
    },
  });
}
