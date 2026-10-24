import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** A stats load failure, with retry and, for one event, a way back to all. */
export function StatsErrorState({
  onRetry,
  onShowAll,
}: {
  onRetry: () => void;
  onShowAll?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10"
    >
      {t("failedLoadOrgStats")}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
        {onShowAll && (
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            {t("statsBackToAll")}
          </Button>
        )}
      </div>
    </div>
  );
}
