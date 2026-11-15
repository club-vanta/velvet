import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { useLogin } from "./api/useLogin";
import { AuthError } from "./components/AuthError";
import { AuthField } from "./components/AuthField";
import { AuthFooterLink } from "./components/AuthFooterLink";
import { AuthLayout } from "./components/AuthLayout";
import { PasswordInput } from "./components/PasswordInput";

export function LoginPage() {
  const { t } = useLanguage();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ username, password });
  }

  return (
    <AuthLayout subtitle={t("staffPortal")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="username" label={t("username")}>
          {(control) => (
            <Input
              {...control}
              data-cy="login-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={login.isPending}
              required
            />
          )}
        </AuthField>

        <AuthField id="password" label={t("password")}>
          {(control) => (
            <PasswordInput
              {...control}
              data-cy="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={login.isPending}
              required
            />
          )}
        </AuthField>

        <AuthError message={login.error?.message} data-cy="login-error" />

        <Button
          type="submit"
          className="w-full"
          disabled={login.isPending}
          data-cy="login-submit"
        >
          {login.isPending ? t("signingIn") : t("signIn")}
        </Button>
      </form>

      <AuthFooterLink to="/forgot-password" data-cy="login-forgot-link">
        {t("forgotPassword")}
      </AuthFooterLink>

      <AuthFooterLink
        to="/signup"
        prompt={t("noAccount")}
        data-cy="login-signup-link"
      >
        {t("signUpLink")}
      </AuthFooterLink>
    </AuthLayout>
  );
}
