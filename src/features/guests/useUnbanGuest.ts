import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import { guestKey } from "@/lib/queryKeys";

/**
 * Unban has no confirmation dialog (same as the Vanted tab), so it is a
 * hook rather than a dialog component.
 */
export function useUnbanGuest(orgId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guest: { id: string; displayname: string }) => {
      const { error } = await api.PATCH(
        "/organizations/{org_id}/guests/{guest_id}/unban",
        {
          params: {
            path: { org_id: orgId, guest_id: guest.id },
          },
        },
      );
      if (error) throw new Error(extractApiError(error, t("unbanFailed")));
      return guest;
    },
    onSuccess: (guest) => {
      void queryClient.invalidateQueries({
        queryKey: ["guests-banned", orgId],
      });
      void queryClient.invalidateQueries({ queryKey: ["meetup-guests"] });
      void queryClient.invalidateQueries({ queryKey: guestKey(guest.id) });
      toast.success(t("guestUnvanted").replace("{0}", guest.displayname));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
