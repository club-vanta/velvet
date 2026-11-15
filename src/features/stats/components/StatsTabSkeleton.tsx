import { Skeleton } from "@/components/ui/skeleton";
import { headlineGrid } from "../lib/headlineGrid";

/** The loading state of a stats tab: headline cards and one chart. */
export function StatsTabSkeleton({
  cards,
  "data-cy": dataCy,
}: {
  /** How many headline cards the loaded tab shows. */
  cards: number;
  "data-cy": string;
}) {
  return (
    <div data-cy={dataCy} className="space-y-3">
      <div className={headlineGrid(cards)}>
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
