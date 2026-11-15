import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { invalidateGuestBan } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { apiErrorMessage } from "../lib/apiErrorMessage";

type GuestRef = { id: string; displayname: string };

/**
 * Lifts a guest's vant in `orgId` (org admins only). Unvanting has no
 * confirmation dialog, so rows and the profile call this directly.
 */
export function useUnbanGuest(orgId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guest: GuestRef) => {
      const { error, response } = await api.PATCH(
        "/organizations/{org_id}/guests/{guest_id}/unban",
        { params: { path: { org_id: orgId, guest_id: guest.id } } },
      );
      if (error) {
        throw new Error(
          apiErrorMessage(response.status, error, {}, "unbanFailed", t),
        );
      }
      return guest;
    },
    onSuccess: (guest) => {
      invalidateGuestBan(queryClient, orgId, guest.id);
      toast.success(t("guestUnvanted").replace("{0}", guest.displayname));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
