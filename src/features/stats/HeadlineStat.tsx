import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCount, isSmallSample } from "./statsFormat";

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
}: {
  label: string;
  value: string;
  /** Context for the number, such as where it happened. */
  subline?: string;
  comparison?: string;
  n?: number;
}) {
  const { t, lang } = useLanguage();
  const small = n !== undefined && isSmallSample(n);

  return (
    <div
      data-headline
      className={cn(
        "min-w-0 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4",
        small && "text-muted-foreground",
      )}
    >
      <p
        data-slot="label"
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </p>
      <p
        data-slot="value"
        className="text-2xl font-semibold tabular-nums sm:text-3xl"
      >
        {value}
      </p>
      {subline && (
        <p
          data-slot="subline"
          className="text-xs text-muted-foreground break-words"
        >
          {subline}
        </p>
      )}
      {comparison && (
        <p
          data-slot="comparison"
          className="text-xs text-muted-foreground tabular-nums"
        >
          {comparison}
        </p>
      )}
      {small && (
        <p data-slot="sample" className="text-xs tabular-nums">
          {t("statsSample").replace("{0}", formatCount(n, lang))}
        </p>
      )}
    </div>
  );
}
