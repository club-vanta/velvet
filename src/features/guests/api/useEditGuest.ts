import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { invalidateGuestIdentity } from "@/api/queryKeys";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { apiErrorMessage } from "../lib/apiErrorMessage";

type UpdateGuestBody = components["schemas"]["UpdateGuestRequest"];

/** Edits a guest's name and Instagram handle (see editGuestBody). */
export function useEditGuest(guestId: string) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateGuestBody) => {
      const { error, response } = await api.PATCH("/guests/{guest_id}", {
        params: { path: { guest_id: guestId } },
        body,
      });
      if (error) {
        throw new Error(
          apiErrorMessage(response.status, error, {}, "failedEditGuest", t),
        );
      }
    },
    onSuccess: () => {
      invalidateGuestIdentity(queryClient, guestId);
      toast.success(t("guestUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
