import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { components } from "@/api/types";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import { invalidateMeetupLocation } from "@/lib/queryKeys";

type MeetupLocation = components["schemas"]["MeetupLocationUpdate"];

/** Sets a meetup's location, or clears it with all three fields null. */
export function useSetMeetupLocation(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: MeetupLocation) => {
      const { data, error } = await api.PATCH(
        "/organizations/{org_id}/meetups/{meetup_id}/location",
        {
          params: { path: { org_id: orgId, meetup_id: meetupId } },
          body: location,
        },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedSaveLocation")));
      return data;
    },
    onSuccess: () => invalidateMeetupLocation(queryClient, orgId, meetupId),
  });
}
