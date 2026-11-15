import { useLanguage } from "@/lib/i18n";

/** A period with no finalized events. */
export function StatsEmptyState() {
  const { t } = useLanguage();
  return (
    <p
      data-cy="stats-empty"
      className="rounded-xl px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10"
    >
      {t("statsEmptyPeriod")}
    </p>
  );
}
