import type { ChartConfig } from "@/components/ui/chart";

/**
 * A chart tooltip row for a value that is a share or rate: the series label
 * on the left and the value as a percent on the right. Pass it as the
 * `formatter` of ChartTooltipContent.
 */
export function percentFormatter(
  config: ChartConfig,
  percent: (value: number) => string,
) {
  return function PercentRow(value: unknown, name: unknown) {
    return (
      <span className="flex w-full justify-between gap-4">
        <span className="text-muted-foreground">
          {config[String(name)]?.label}
        </span>
        <span className="font-mono font-medium tabular-nums">
          {percent(Number(value))}
        </span>
      </span>
    );
  };
}
