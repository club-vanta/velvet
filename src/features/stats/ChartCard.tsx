import { useId, type ReactNode } from "react";
import { StatCard } from "@/components/StatCard";

/**
 * A titled card for a chart, with the look of the meetup stat cards. Children
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
    <StatCard title={title} headingId={headingId}>
      {typeof children === "function" ? children(headingId) : children}
    </StatCard>
  );
}
