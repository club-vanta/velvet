import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** The org's vanted list failed, so whether this guest is vanted is unknown. */
export function VantStatusError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground"
      data-cy="guest-vant-status-error"
    >
      {t("failedLoadVantStatus")}
      <Button variant="ghost" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
