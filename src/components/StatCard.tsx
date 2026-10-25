export function StatCard({
  title,
  headingId,
  children,
}: {
  title: string;
  /** Gives the heading an id, so content inside can be labelled by it. */
  headingId?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={headingId ? undefined : title}
      aria-labelledby={headingId}
      className="rounded-xl bg-card p-3 sm:p-4 ring-1 ring-foreground/10 space-y-2 sm:space-y-3 min-w-0"
    >
      <h2
        id={headingId}
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
