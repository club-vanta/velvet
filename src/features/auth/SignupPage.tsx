import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { useRegister } from "./api/useRegister";
import { AuthError } from "./components/AuthError";
import { AuthField } from "./components/AuthField";
import { AuthFooterLink } from "./components/AuthFooterLink";
import { AuthLayout } from "./components/AuthLayout";
import { AuthSuccess } from "./components/AuthSuccess";
import { PasswordInput } from "./components/PasswordInput";

export function SignupPage() {
  const { t } = useLanguage();
  const register = useRegister();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate({ username, password });
  }

  if (register.isSuccess) {
    return (
      <AuthLayout subtitle={t("createAccount")}>
        <AuthSuccess message={t("signupSuccess")} name="signup" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle={t("createAccount")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="username" label={t("username")}>
          {(control) => (
            <Input
              {...control}
              data-cy="signup-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={register.isPending}
              required
            />
          )}
        </AuthField>

        <AuthField id="password" label={t("password")} hint={t("minChars")}>
          {(control) => (
            <PasswordInput
              {...control}
              data-cy="signup-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={register.isPending}
              required
              enforceMinLength
            />
          )}
        </AuthField>

        <AuthError message={register.error?.message} data-cy="signup-error" />

        <Button
          type="submit"
          className="w-full"
          disabled={register.isPending}
          data-cy="signup-submit"
        >
          {register.isPending ? t("signingUp") : t("signUp")}
        </Button>
      </form>

      <AuthFooterLink
        to="/"
        prompt={t("alreadyHaveAccount")}
        data-cy="signup-login-link"
      >
        {t("signInLink")}
      </AuthFooterLink>
    </AuthLayout>
  );
}
