import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { headlineGrid } from "./headlineGrid";
import { StatsErrorState } from "./StatsErrorState";

/** The loading state of a stats tab: headline cards and one chart. */
function StatsTabSkeleton({
  cards,
  testId,
}: {
  /** How many headline cards the loaded tab shows. */
  cards: number;
  testId: string;
}) {
  return (
    <div data-testid={testId} className="space-y-3">
      <div className={headlineGrid(cards)}>
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

/**
 * Shows the skeleton while a tab's query loads and the error state when it
 * fails, and hands the loaded data to `children`.
 */
export function StatsTabGate<T>({
  statsQ,
  single,
  cards,
  testId,
  onShowAll,
  children,
}: {
  statsQ: UseQueryResult<T | undefined>;
  single: boolean;
  /** How many headline cards the loaded tab shows. */
  cards: number;
  testId: string;
  /** Offered with the error only when a single event is selected. */
  onShowAll: () => void;
  children: (data: T) => ReactNode;
}) {
  if (statsQ.isPending) {
    return <StatsTabSkeleton cards={cards} testId={testId} />;
  }
  if (statsQ.isError || !statsQ.data) {
    return (
      <StatsErrorState
        onRetry={() => statsQ.refetch()}
        onShowAll={single ? onShowAll : undefined}
      />
    );
  }
  return children(statsQ.data);
}
