import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { staffKey } from "@/api/queryKeys";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";

type User = components["schemas"]["UserPublic"];
export type SiteRole = components["schemas"]["PossibleRoles"];

// Every staff change shows up in both tabs and in the pending badges, which
// all live under staffKey.
function useInvalidateStaff() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: staffKey });
}

/** Approves an account, or revokes the approval of an active one. */
export function useSetApproval() {
  const { t } = useLanguage();
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({ user, approve }: { user: User; approve: boolean }) => {
      const { error } = await api.PATCH("/staff/{user_id}/approve", {
        params: { path: { user_id: user.id } },
        body: { is_approved: approve },
      });
      if (error) throw new Error(extractApiError(error, t("failedApproval")));
    },
    onSuccess: (_, { approve }) => {
      invalidate();
      toast.success(approve ? t("accountApproved") : t("approvalRevoked"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSetSiteRole() {
  const { t } = useLanguage();
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({ user, role }: { user: User; role: SiteRole }) => {
      const { error } = await api.PATCH("/staff/{user_id}/role", {
        params: { path: { user_id: user.id } },
        body: { role },
      });
      if (error) throw new Error(extractApiError(error, t("failedUpdateRole")));
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("roleUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useEnableStaff() {
  const { t } = useLanguage();
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async (user: User) => {
      const { error } = await api.PATCH("/staff/{user_id}/enable", {
        params: { path: { user_id: user.id } },
      });
      if (error) throw new Error(extractApiError(error, t("failedEnable")));
    },
    onSuccess: () => {
      invalidate();
      toast.success(t("accountReenabled"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDisableStaff() {
  const { t } = useLanguage();
  const invalidate = useInvalidateStaff();
  return useMutation({
    mutationFn: async ({ user, reason }: { user: User; reason: string }) => {
      const { error } = await api.PATCH("/staff/{user_id}/disable", {
        params: { path: { user_id: user.id } },
        body: { reason },
      });
      if (error) throw new Error(extractApiError(error, t("failedDisable")));
    },
    onSuccess: (_, { user }) => {
      invalidate();
      toast.success(t("userDisabled").replace("{0}", user.username));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/** A one-time password recovery code for `user`, shown to the admin once. */
export function useGenerateRecoveryCode() {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (user: User) => {
      const { data, error } = await api.POST("/staff/{user_id}/recovery-code", {
        params: { path: { user_id: user.id } },
      });
      if (error) throw new Error("Failed to generate recovery code");
      return data.code;
    },
    // Network failures included: the admin only needs to know to try again.
    onError: () => toast.error(t("failedGenerateCode")),
  });
}
