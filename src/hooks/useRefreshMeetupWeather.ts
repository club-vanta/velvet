import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import { invalidateMeetupWeather } from "@/lib/queryKeys";

/** Fetches a meetup's weather again; the error carries the backend's reason. */
export function useRefreshMeetupWeather(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/meetups/{meetup_id}/weather/refresh",
        { params: { path: { org_id: orgId, meetup_id: meetupId } } },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedRefreshWeather")));
      return data;
    },
    onSuccess: () => invalidateMeetupWeather(queryClient, orgId, meetupId),
  });
}
