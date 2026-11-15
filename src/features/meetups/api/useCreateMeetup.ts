import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetups } from "@/api/queryKeys";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";

type MeetupCreate = components["schemas"]["MeetupCreate"];

/** Creates a meetup; the error carries the backend's reason. */
export function useCreateMeetup(orgId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: MeetupCreate) => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/",
        { params: { path: { org_id: orgId } }, body },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedCreateMeetup")));
      return data;
    },
    onSuccess: () => invalidateMeetups(queryClient, orgId),
  });
}
