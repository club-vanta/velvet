import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/i18n";
import { API_BASE_URL } from "@/api/client";
import { extractApiError } from "@/api/errors";

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-recovery-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as unknown;
        setError(extractApiError(body, t("invalidRecoveryCode")));
        return;
      }
      navigate("/reset-password", { state: { username, code } });
    } catch {
      setError(t("somethingWentWrong"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl leading-none">
              V
            </span>
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-2xl font-semibold">Alter Tracker</h1>
            <p className="text-sm text-muted-foreground">
              {t("forgotPasswordTitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-medium">
              {t("username")}
            </label>
            <Input
              id="username"
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
            <label htmlFor="code" className="text-sm font-medium">
              {t("recoveryCodeLabel")}
            </label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="whitespace-pre-line text-center">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t("verifying") : t("verifyCode")}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="underline underline-offset-2">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
