import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetupGuests } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { rsvpPath } from "./rsvpPath";

/** Records that a guest paid the entrance fee. */
export function useMarkPaid(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestId: string) => {
      const { data, error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment",
        { params: rsvpPath(orgId, meetupId, guestId) },
      );
      if (error) throw new Error(extractApiError(error, t("failedMarkPaid")));
      return data;
    },
    onSuccess: () => invalidateMeetupGuests(queryClient, orgId, meetupId),
  });
}
