import { useId, type ReactNode } from "react";
import { StatCard } from "@/components/StatCard";

/**
 * A titled card for a chart: a stat card with a caption heading. Children
 * may be a function of the heading id, to label a table by its card.
 */
export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode | ((headingId: string) => ReactNode);
}) {
  const headingId = useId();
  return (
    <StatCard title={title} headingId={headingId} heading="caption">
      {typeof children === "function" ? children(headingId) : children}
    </StatCard>
  );
}
