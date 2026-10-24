export function StatCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl bg-card p-3 sm:p-4 ring-1 ring-foreground/10 space-y-2 sm:space-y-3 min-w-0"
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
