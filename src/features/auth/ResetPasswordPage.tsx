import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useResetPassword } from "./api/useResetPassword";
import { AuthError } from "./components/AuthError";
import { AuthField } from "./components/AuthField";
import { AuthLayout } from "./components/AuthLayout";
import { AuthSuccess } from "./components/AuthSuccess";
import { PasswordInput } from "./components/PasswordInput";
import { minCharsMessage } from "./lib/password";
import { isRecoveryState } from "./lib/recoveryState";

/** Step 2 of password recovery: set a new password with the verified code. */
export function ResetPasswordPage() {
  const { t } = useLanguage();
  const { state } = useLocation();
  const reset = useResetPassword();
  const [newPassword, setNewPassword] = useState("");

  // Only the forgot-password page can open this one (see RecoveryState).
  if (!isRecoveryState(state)) return <Navigate to="/" replace />;
  const { username, code } = state;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset.mutate({ username, code, newPassword });
  }

  return (
    <AuthLayout subtitle={t("forgotPasswordTitle")}>
      {reset.isSuccess ? (
        <AuthSuccess
          message={t("passwordChanged").replace("{0}", username)}
          name="reset"
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthField
            id="new-password"
            label={t("newPassword")}
            hint={minCharsMessage(t)}
          >
            {(control) => (
              <PasswordInput
                {...control}
                data-cy="reset-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={reset.isPending}
                required
                enforceMinLength
              />
            )}
          </AuthField>

          <AuthError message={reset.error?.message} data-cy="reset-error" />

          <Button
            type="submit"
            className="w-full"
            disabled={reset.isPending}
            data-cy="reset-submit"
          >
            {reset.isPending ? t("settingPassword") : t("setNewPassword")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
