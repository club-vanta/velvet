import { cn } from "@/lib/utils";

/**
 * Labelled counts inside a stat card, one row each. `twoColumns` lays them out
 * in two columns until the page fits all the cards in one row, for a card that
 * spans the whole width on a phone.
 */
export function StatRows({
  rows,
  twoColumns = false,
}: {
  rows: {
    /** Names the value for tests: `stat-<id>`. */
    id: string;
    label: string;
    value: number;
    dotClass?: string;
    emphasis?: boolean;
  }[];
  twoColumns?: boolean;
}) {
  return (
    <dl
      className={cn(
        "space-y-1 text-sm",
        twoColumns &&
          "grid grid-cols-2 gap-x-6 gap-y-1 space-y-0 @2xl:block @2xl:space-y-1",
      )}
    >
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-2">
          <dt className="flex items-center gap-2 text-muted-foreground min-w-0">
            {row.dotClass && (
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-full", row.dotClass)}
              />
            )}
            <span className="truncate">{row.label}</span>
          </dt>
          <dd
            data-cy={`stat-${row.id}`}
            className={cn(
              "font-medium tabular-nums",
              row.emphasis && "text-amber-600 dark:text-amber-400",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
