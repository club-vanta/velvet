import { useLanguage } from "@/lib/i18n";

/** The centered card every signed-out page uses: logo, app name, subtitle. */
export function AuthLayout({
  subtitle,
  children,
}: {
  subtitle: string;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div
            aria-hidden
            className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"
          >
            <span className="text-primary-foreground font-bold text-xl leading-none">
              V
            </span>
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-2xl font-semibold">{t("appName")}</h1>
            <p
              data-cy="auth-subtitle"
              className="text-sm text-muted-foreground"
            >
              {subtitle}
            </p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
