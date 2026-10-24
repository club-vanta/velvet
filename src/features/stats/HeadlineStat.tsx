import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isSmallSample } from "./statsFormat";

/**
 * One big number with an optional comparison line. When `n` (the people the
 * number is computed from) is small, the card is dimmed and shows `n`.
 */
export function HeadlineStat({
  label,
  value,
  comparison,
  n,
}: {
  label: string;
  value: string;
  comparison?: string;
  n?: number;
}) {
  const { t } = useLanguage();
  const small = n !== undefined && isSmallSample(n);

  return (
    <div
      data-headline
      className={cn(
        "min-w-0 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4",
        small && "text-muted-foreground",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      {comparison && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {comparison}
        </p>
      )}
      {small && (
        <p className="text-xs tabular-nums">
          {t("statsSample").replace("{0}", String(n))}
        </p>
      )}
    </div>
  );
}
