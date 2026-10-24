import { useArrivalsStats } from "@/hooks/useArrivalsStats";
import { StatsErrorState } from "./StatsErrorState";
import { StatsTabSkeleton } from "./StatsTabState";
import type { StatsTabProps } from "./statsTab";

export function ArrivalsTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useArrivalsStats(orgId, query);
  const single = !!query?.meetupId;

  if (statsQ.isPending) {
    return (
      <StatsTabSkeleton single={single} cards={4} testId="arrivals-skeleton" />
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <StatsErrorState
        onRetry={() => statsQ.refetch()}
        onShowAll={single ? onShowAll : undefined}
      />
    );
  }

  return null;
}
