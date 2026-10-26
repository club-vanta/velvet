import type { ReactNode } from "react";

/**
 * The frame of a custom chart tooltip, for charts whose tooltip shows more
 * than ChartTooltipContent can: the events count, a meetup's name and date,
 * or several values of one hour.
 */
export function TooltipBox({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {children}
    </div>
  );
}
