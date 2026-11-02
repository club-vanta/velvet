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
  tab,
  onShowAll,
  children,
}: {
  statsQ: UseQueryResult<T | undefined>;
  single: boolean;
  /** How many headline cards the loaded tab shows. */
  cards: number;
  /** The tab's URL value, which names its skeleton for tests. */
  tab: string;
  /** Offered with the error only when a single event is selected. */
  onShowAll: () => void;
  children: (data: T) => ReactNode;
}) {
  if (statsQ.isPending) {
    return <StatsTabSkeleton cards={cards} data-cy={`stats-${tab}-skeleton`} />;
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
