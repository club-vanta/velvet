import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { invalidateGuestBan } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { apiErrorMessage } from "../lib/apiErrorMessage";

type GuestRef = { id: string; displayname: string };

/** Vants a guest in `orgId` (org admins only). */
export function useBanGuest(orgId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      guest,
      reason,
    }: {
      guest: GuestRef;
      reason: string;
    }) => {
      const { error, response } = await api.PATCH(
        "/organizations/{org_id}/guests/{guest_id}/ban",
        {
          params: { path: { org_id: orgId, guest_id: guest.id } },
          body: { reason },
        },
      );
      if (error) {
        throw new Error(
          apiErrorMessage(response.status, error, {}, "banFailed", t),
        );
      }
      return guest;
    },
    onSuccess: (guest) => {
      invalidateGuestBan(queryClient, orgId, guest.id);
      toast.success(t("guestVanted").replace("{0}", guest.displayname));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
