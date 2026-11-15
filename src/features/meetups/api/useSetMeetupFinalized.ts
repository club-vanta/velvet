import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import {
  invalidateMeetup,
  invalidateMeetupGuests,
  meetupKey,
} from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

/** Finalizes the meetup (`true`) or reopens it (`false`). */
export function useSetMeetupFinalized(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (finalized: boolean) => {
      const path = finalized
        ? ("/organizations/{org_id}/meetups/{meetup_id}/finalize" as const)
        : ("/organizations/{org_id}/meetups/{meetup_id}/unfinalize" as const);
      const { data, error } = await api.PATCH(path, {
        params: { path: { org_id: orgId, meetup_id: meetupId } },
      });
      if (error)
        throw new Error(extractApiError(error, t("somethingWentWrong")));
      return data;
    },
    onSuccess: (data) => {
      // Write the answer straight into the cache so the page locks or
      // unlocks at once, then refetch what depends on it.
      queryClient.setQueryData(meetupKey(orgId, meetupId), data);
      invalidateMeetup(queryClient, orgId, meetupId);
      // Finalizing turns pending RSVPs into no-shows, reopening turns them
      // back, and only finalized meetups count in the org statistics.
      invalidateMeetupGuests(queryClient, orgId, meetupId);
    },
  });
}
