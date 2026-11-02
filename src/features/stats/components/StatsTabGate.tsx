import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { StatsErrorState } from "./StatsErrorState";
import { StatsTabSkeleton } from "./StatsTabSkeleton";

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
