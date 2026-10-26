import type { StatsQuery } from "@/lib/statsQuery";

/** What every stats tab gets from the page, which owns the filters. */
export type StatsTabProps = {
  orgId: string;
  /** null while the filters are not ready; the tab must not fetch yet. */
  query: StatsQuery | null;
  /** Clears the selected event, the way out of an error about it. */
  onShowAll: () => void;
};
