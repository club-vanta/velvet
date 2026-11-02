import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import type { RecoveryState } from "../lib/recoveryState";

/** Sets a new password with a verified recovery code, which it uses up. */
export function useResetPassword() {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({
      username,
      code,
      newPassword,
    }: RecoveryState & { newPassword: string }) => {
      const { data, error } = await api.POST("/auth/reset-password", {
        body: { username, code, new_password: newPassword },
      });
      if (error) {
        throw new Error(extractApiError(error, t("somethingWentWrong")));
      }
      return data;
    },
  });
}
