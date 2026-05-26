import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";

// Derive org slug from hostname: velvet.club-vanta.com → "club-vanta"
// Falls back to "club-vanta" on localhost or any unrecognised pattern.
function getOrgSlug(): string {
  const parts = window.location.hostname.split(".");
  return parts.length >= 3 ? parts[1] : "club-vanta";
}

export function SignupPage() {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const { error, response } = await api.POST("/auth/register", {
        body: { username, password, org_slug: getOrgSlug() },
      });
      if (error) {
        if (response.status === 409) {
          setError(t("usernameInUse"));
        } else {
          setError(t("somethingWentWrong"));
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t("somethingWentWrong"));
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
            <p className="text-sm text-muted-foreground">
              {t("createAccount")}
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {t("signupSuccess")}{" "}
                <a
                  href="mailto:contacto@clubvanta.com"
                  className="underline underline-offset-2"
                >
                  contacto@clubvanta.com
                </a>
                .
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
              <label htmlFor="password" className="text-sm font-medium">
                {t("password")}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("signingUp") : t("signUp")}
            </Button>
          </form>
        )}

        {!success && (
          <p className="text-center text-xs text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link to="/" className="underline underline-offset-2">
              {t("signInLink")}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
