import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { invalidateMeetup } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

/** Makes the meetup a paid event (`true`) or a free one (`false`). */
export function useSetPaymentRequirement(orgId: string, meetupId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (required: boolean) => {
      const path = required
        ? ("/organizations/{org_id}/meetups/{meetup_id}/enable-payment" as const)
        : ("/organizations/{org_id}/meetups/{meetup_id}/disable-payment" as const);
      const { data, error } = await api.PATCH(path, {
        params: { path: { org_id: orgId, meetup_id: meetupId } },
      });
      if (error)
        throw new Error(
          extractApiError(error, t("failedUpdatePaymentRequirement")),
        );
      return data;
    },
    onSuccess: () => invalidateMeetup(queryClient, orgId, meetupId),
  });
}
