import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetupGuests } from "@/api/queryKeys";
import type { GuestType } from "@/domain/guest";
import { useLanguage } from "@/lib/i18n";
import { rsvpPath } from "./rsvpPath";

/** Changes what a guest is at this meetup (regular, invited, vendor, staff). */
export function useSetGuestType(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      guestId,
      guestType,
    }: {
      guestId: string;
      guestType: GuestType;
    }) => {
      const { data, error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
        {
          params: rsvpPath(orgId, meetupId, guestId),
          body: { guest_type: guestType },
        },
      );
      if (error || !data)
        throw new Error(extractApiError(error, t("failedChangeGuestType")));
      return data;
    },
    onSuccess: () => invalidateMeetupGuests(queryClient, orgId, meetupId),
  });
}
