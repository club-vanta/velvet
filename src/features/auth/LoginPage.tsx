import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { PasswordInput } from "./components/PasswordInput";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl leading-none">
              V
            </span>
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-2xl font-semibold">Alter Tracker</h1>
            <p className="text-sm text-muted-foreground">{t("staffPortal")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-medium">
              {t("username")}
            </label>
            <Input
              id="username"
              data-cy="login-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              {t("password")}
            </label>
            <PasswordInput
              id="password"
              data-cy="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive" data-cy="login-error">
              <AlertDescription className="whitespace-pre-line text-center">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
            data-cy="login-submit"
          >
            {isPending ? t("signingIn") : t("signIn")}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/forgot-password" className="underline underline-offset-2">
            {t("forgotPassword")}
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          {t("noAccount")}{" "}
          <Link to="/signup" className="underline underline-offset-2">
            {t("signUpLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
