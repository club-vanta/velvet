import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import type { RecoveryState } from "../lib/recoveryState";

/** Checks a recovery code without using it up. */
export function useVerifyRecoveryCode() {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (body: RecoveryState) => {
      const { data, error } = await api.POST("/auth/verify-recovery-code", {
        body,
      });
      if (error) {
        throw new Error(extractApiError(error, t("invalidRecoveryCode")));
      }
      return data;
    },
  });
}
