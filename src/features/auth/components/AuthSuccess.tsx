import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** The end of a signed-out flow (signup, password reset): a message and a way back. */
export function AuthSuccess({
  message,
  name,
}: {
  message: string;
  /** Prefix of the data-cy attributes (`<name>-success`, `<name>-back-to-login`). */
  name: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Alert data-cy={`${name}-success`}>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Link
        to="/"
        data-cy={`${name}-back-to-login`}
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        {t("backToLogin")}
      </Link>
    </div>
  );
}
