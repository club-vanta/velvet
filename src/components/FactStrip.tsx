import { cn } from "@/lib/utils";

const COLS_CLASS = {
  2: "@sm:grid-cols-2",
  3: "@sm:grid-cols-3",
  4: "@sm:grid-cols-4",
} as const;

/**
 * A row of key facts split by hairlines, used across the bottom of a panel
 * (guest profile, featured meetup, org totals). Needs an `@container`
 * ancestor: in narrow containers each fact becomes a label/value row so long
 * values never get split mid-word, and from `@sm` up they sit side by side.
 */
export function FactStrip({
  cols,
  className,
  children,
}: {
  cols: keyof typeof COLS_CLASS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid divide-y @sm:divide-x @sm:divide-y-0",
        COLS_CLASS[cols],
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Fact({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  // A secondary line under the value, e.g. a percentage or a progress bar.
  hint?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 px-4 py-2.5 @sm:block @sm:py-3 @md:px-5 @md:py-4">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-base font-medium leading-snug @sm:mt-1 @sm:text-left @md:text-lg">
        {children}
      </dd>
      {hint && (
        <dd className="basis-full text-right text-xs text-muted-foreground @sm:mt-1 @sm:text-left">
          {hint}
        </dd>
      )}
    </div>
  );
}
