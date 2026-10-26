import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCount, formatRate, isSmallSample } from "./statsFormat";

/**
 * A table cell with a rate computed from `n` people. A rate from few people
 * is dimmed and shows its n; a missing rate shows a dash and no n.
 */
export function RateCell({ rate, n }: { rate: number | null; n: number }) {
  const { t, lang } = useLanguage();
  const small = rate !== null && isSmallSample(n);

  return (
    <td
      data-slot="rate"
      className={cn("py-1.5 text-right", small && "text-muted-foreground")}
    >
      <span data-slot="rate-value">{formatRate(rate, lang)}</span>
      {small && (
        <span data-slot="sample" className="ml-2 text-xs">
          {t("statsSample").replace("{0}", formatCount(n, lang))}
        </span>
      )}
    </td>
  );
}
