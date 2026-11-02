import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetupGuests } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { rsvpPath } from "./rsvpPath";

/** Reverses a check-in; the backend records the reason. */
export function useUndoCheckIn(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guestId,
      reason,
    }: {
      guestId: string;
      reason: string;
    }) => {
      const { data, error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/undo-checkin",
        { params: rsvpPath(orgId, meetupId, guestId), body: { reason } },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedUndoCheckIn")));
      return data;
    },
    onSuccess: () => invalidateMeetupGuests(queryClient, orgId, meetupId),
  });
}
