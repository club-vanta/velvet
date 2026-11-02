import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { invalidateGuestIdentity } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { MAZMO_LOOKUP_ERRORS, apiErrorMessage } from "../lib/apiErrorMessage";

/**
 * Links a guest to a Mazmo account. The backend takes the name and profile
 * from Mazmo, so the guest's identity changes everywhere it is shown.
 */
export function useLinkMazmo(guestId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      const { error, response } = await api.PATCH(
        "/guests/{guest_id}/link-mazmo",
        {
          params: { path: { guest_id: guestId } },
          body: { username },
        },
      );
      if (error) {
        throw new Error(
          apiErrorMessage(
            response.status,
            error,
            MAZMO_LOOKUP_ERRORS,
            "failedLinkMazmo",
            t,
          ),
        );
      }
    },
    onSuccess: () => {
      invalidateGuestIdentity(queryClient, guestId);
      toast.success(t("mazmoLinked"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Removes a guest's Mazmo link and the Mazmo profile that came with it. */
export function useUnlinkMazmo(guestId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.PATCH(
        "/guests/{guest_id}/unlink-mazmo",
        { params: { path: { guest_id: guestId } } },
      );
      if (error) {
        throw new Error(
          apiErrorMessage(response.status, error, {}, "failedUnlinkMazmo", t),
        );
      }
    },
    onSuccess: () => {
      invalidateGuestIdentity(queryClient, guestId);
      toast.success(t("mazmoUnlinked"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
