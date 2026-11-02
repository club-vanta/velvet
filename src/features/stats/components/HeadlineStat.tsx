import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCount, isSmallSample } from "../lib/statsFormat";

/**
 * One big number with an optional comparison line. When `n` (the people the
 * number is computed from) is small, the card is dimmed and shows `n`.
 */
export function HeadlineStat({
  label,
  value,
  subline,
  comparison,
  n,
  "data-cy": dataCy,
}: {
  label: string;
  value: string;
  /** Context for the number, such as where it happened. */
  subline?: string;
  comparison?: string;
  n?: number;
  /** Names the card for tests: `stats-headline-<what it counts>`. */
  "data-cy": string;
}) {
  const { t, lang } = useLanguage();
  const small = n !== undefined && isSmallSample(n);

  return (
    <div
      data-cy={dataCy}
      className={cn(
        "min-w-0 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4",
        small && "text-muted-foreground",
      )}
    >
      <p
        data-cy="stats-headline-label"
        className="text-xs font-medium text-muted-foreground sm:text-sm"
      >
        {label}
      </p>
      <p
        data-cy="stats-headline-value"
        className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
      >
        {value}
      </p>
      {subline && (
        <p
          data-cy="stats-headline-subline"
          className="text-xs text-muted-foreground break-words"
        >
          {subline}
        </p>
      )}
      {comparison && (
        <p
          data-cy="stats-headline-comparison"
          className="text-xs text-muted-foreground tabular-nums"
        >
          {comparison}
        </p>
      )}
      {small && (
        <p data-cy="stats-headline-sample" className="text-xs tabular-nums">
          {t("statsSample").replace("{0}", formatCount(n, lang))}
        </p>
      )}
    </div>
  );
}
