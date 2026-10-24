import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { headlineGrid } from "./headlineGrid";

/** The loading state of a stats tab: headline cards and one chart. */
export function StatsTabSkeleton({
  single,
  cards,
  testId,
}: {
  single: boolean;
  /** How many headline cards the loaded tab shows. */
  cards: number;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="space-y-3">
      <div className={headlineGrid(single)}>
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/** A period with no finalized events. */
export function StatsEmptyState() {
  const { t } = useLanguage();
  return (
    <p className="rounded-xl px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
      {t("statsEmptyPeriod")}
    </p>
  );
}
