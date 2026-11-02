import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { allGuestsKey } from "@/api/queryKeys";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { MAZMO_LOOKUP_ERRORS, apiErrorMessage } from "../lib/apiErrorMessage";

type Guest = components["schemas"]["GuestPublic"];
type MazmoGuestBody = components["schemas"]["CreateGuestRequest"];
type ManualGuestBody = components["schemas"]["CreateManualGuestRequest"];

const ADD_BY_MAZMO_ERRORS = {
  ...MAZMO_LOOKUP_ERRORS,
  409: "guestAlreadyRegistered",
} as const;

/** A new guest only shows up in the directory: no RSVPs, vants or stats yet. */
function useOnGuestAdded() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  return (guest: Guest) => {
    void queryClient.invalidateQueries({ queryKey: allGuestsKey });
    toast.success(t("guestAdded").replace("{0}", guest.displayname));
  };
}

/** Registers a guest by Mazmo handle; the backend looks up the rest. */
export function useAddMazmoGuest() {
  const { t } = useLanguage();
  const onSuccess = useOnGuestAdded();
  return useMutation({
    mutationFn: async (body: MazmoGuestBody) => {
      const { data, error, response } = await api.POST("/guests/mazmo", {
        body,
      });
      // Every success has a body; no body means the request failed.
      if (!data) {
        throw new Error(
          apiErrorMessage(
            response.status,
            error,
            ADD_BY_MAZMO_ERRORS,
            "somethingWentWrong",
            t,
          ),
        );
      }
      return data;
    },
    onSuccess,
    onError: (err: Error) => toast.error(err.message),
  });
}

/** Registers a guest who has no Mazmo account. */
export function useAddManualGuest() {
  const { t } = useLanguage();
  const onSuccess = useOnGuestAdded();
  return useMutation({
    mutationFn: async (body: ManualGuestBody) => {
      const { data, error, response } = await api.POST("/guests/manual", {
        body,
      });
      // Every success has a body; no body means the request failed.
      if (!data) {
        throw new Error(
          apiErrorMessage(response.status, error, {}, "somethingWentWrong", t),
        );
      }
      return data;
    },
    onSuccess,
    onError: (err: Error) => toast.error(err.message),
  });
}
