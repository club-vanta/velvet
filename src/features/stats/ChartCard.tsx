import { useId, type ReactNode } from "react";

/**
 * A titled card for a chart, with a sentence-case heading that reads as a
 * caption. Children may be a function of the heading id, to label a table by
 * its card.
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
    <section
      aria-labelledby={headingId}
      className="min-w-0 space-y-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4"
    >
      <h2 id={headingId} className="text-sm font-medium">
        {title}
      </h2>
      {typeof children === "function" ? children(headingId) : children}
    </section>
  );
}
