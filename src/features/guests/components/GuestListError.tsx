import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** A guest list that failed to load, with a retry. */
export function GuestListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Alert variant="destructive" data-cy="guests-error">
      <AlertDescription className="flex items-center justify-between">
        <span data-cy="guests-error-message">{message}</span>
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
