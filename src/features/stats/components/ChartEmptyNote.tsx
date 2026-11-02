import type { ReactNode } from "react";

/** Says why a chart card has nothing to draw, in place of the chart. */
export function ChartEmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
  );
}
