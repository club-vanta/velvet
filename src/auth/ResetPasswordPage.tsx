import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from "@/lib/i18n";
import { API_BASE_URL } from "@/api/client";
import { extractApiError } from "@/api/errors";

export function ResetPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { username: string; code: string } | null;

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!state?.username || !state?.code) {
      navigate("/");
    }
  }, [state, navigate]);

  if (!state?.username || !state?.code) return null;

  const { username, code } = state;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code, new_password: newPassword }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as unknown;
        setError(extractApiError(body, t("somethingWentWrong")));
        return;
      }
      setSuccess(true);
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

        {success ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {t("passwordChanged").replace("{0}", username)}
              </AlertDescription>
            </Alert>
            <Link
              to="/"
              className={buttonVariants({
                variant: "outline",
                className: "w-full",
              })}
            >
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="new-password" className="text-sm font-medium">
                {t("newPassword")}
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isPending}
                  required
                  minLength={15}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t("minChars")}</p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-line text-center">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("settingPassword") : t("setNewPassword")}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
