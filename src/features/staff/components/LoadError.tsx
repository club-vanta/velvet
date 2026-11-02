import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** A list that failed to load, with a retry. */
export function LoadError({
  message,
  onRetry,
  ...props
}: {
  message: string;
  onRetry: () => void;
  "data-cy"?: string;
}) {
  const { t } = useLanguage();
  return (
    <Alert variant="destructive" {...props}>
      <AlertDescription className="flex items-center justify-between">
        {message}
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
