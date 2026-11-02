import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { useVerifyRecoveryCode } from "./api/useVerifyRecoveryCode";
import { AuthError } from "./components/AuthError";
import { AuthField } from "./components/AuthField";
import { AuthFooterLink } from "./components/AuthFooterLink";
import { AuthLayout } from "./components/AuthLayout";
import type { RecoveryState } from "./lib/recoveryState";

/** Step 1 of password recovery: check the code a site admin generated. */
export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const verify = useVerifyRecoveryCode();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const state: RecoveryState = { username, code };
    verify.mutate(state, {
      onSuccess: () => navigate("/reset-password", { state }),
    });
  }

  return (
    <AuthLayout subtitle={t("forgotPasswordTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="username" label={t("username")}>
          {(control) => (
            <Input
              {...control}
              data-cy="forgot-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={verify.isPending}
              required
            />
          )}
        </AuthField>

        <AuthField id="code" label={t("recoveryCodeLabel")}>
          {(control) => (
            <Input
              {...control}
              data-cy="forgot-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={verify.isPending}
              required
            />
          )}
        </AuthField>

        <AuthError message={verify.error?.message} data-cy="forgot-error" />

        <Button
          type="submit"
          className="w-full"
          disabled={verify.isPending}
          data-cy="forgot-submit"
        >
          {verify.isPending ? t("verifying") : t("verifyCode")}
        </Button>
      </form>

      <AuthFooterLink to="/" data-cy="forgot-back-to-login">
        {t("backToLogin")}
      </AuthFooterLink>
    </AuthLayout>
  );
}
