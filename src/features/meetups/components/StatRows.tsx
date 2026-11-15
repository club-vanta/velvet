import { cn } from "@/lib/utils";

/** Labelled counts inside a stat card, one row each. */
export function StatRows({
  rows,
}: {
  rows: {
    /** Names the value for tests: `stat-<id>`. */
    id: string;
    label: string;
    value: number;
    dotClass?: string;
    emphasis?: boolean;
  }[];
}) {
  return (
    <dl className="space-y-1 text-sm">
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
