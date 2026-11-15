import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { invalidateAllGuestIdentities } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";
import { apiErrorMessage } from "../lib/apiErrorMessage";
import { refreshSummary } from "../lib/refreshSummary";

/**
 * Re-fetches every Mazmo-linked guest's name and profile from Mazmo. Any
 * guest can be renamed, so every guest-identity query is refreshed.
 */
export function useRefreshFromMazmo() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST("/guests/refresh-mazmo");
      // Every success has a body; no body means the request failed.
      if (!data) {
        throw new Error(
          apiErrorMessage(
            response.status,
            error,
            { 504: "mazmoUnreachable" },
            "somethingWentWrong",
            t,
          ),
        );
      }
      return data;
    },
    onSuccess: (data) => {
      invalidateAllGuestIdentities(queryClient);
      toast.success(refreshSummary(data, t));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
