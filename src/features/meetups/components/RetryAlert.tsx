import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** A failed load, with a retry next to the message. */
export function RetryAlert({
  message,
  onRetry,
  "data-cy": dataCy,
}: {
  message: string;
  onRetry: () => void;
  "data-cy"?: string;
}) {
  const { t } = useLanguage();
  return (
    <Alert variant="destructive" data-cy={dataCy}>
      <AlertDescription className="flex items-center justify-between">
        {message}
        <Button variant="ghost" size="sm" onClick={onRetry} data-cy="retry">
          {t("retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
