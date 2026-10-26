import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCount, formatRate, isSmallSample } from "./statsFormat";

export type RateRow = {
  key: string;
  label: string;
  rate: number | null;
  /** The people the rate is computed from. */
  n: number;
};

/** Each bar's entrance starts this much after the previous one. */
const STAGGER_MS = 40;

/**
 * Rates of several groups as a table whose rate cells carry a bar. Bars are
 * drawn against the largest rate shown, so the groups compare at a glance,
 * and the number sits beside each one. A rate from few people is dimmed and
 * shows its n, like RateCell; a missing rate shows a dash and no bar.
 */
export function RateBars({
  rows,
  groupHeader,
  rateHeader,
  labelledBy,
}: {
  rows: RateRow[];
  groupHeader: string;
  rateHeader: string;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const max = Math.max(0, ...rows.map((r) => r.rate ?? 0));
  const head = "pb-1.5 text-xs font-medium text-muted-foreground";

  return (
    <table aria-labelledby={labelledBy} className="w-full text-sm tabular-nums">
      <thead>
        <tr>
          <th scope="col" className={cn(head, "text-left")}>
            {groupHeader}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {rateHeader}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const small = row.rate !== null && isSmallSample(row.n);
          return (
            <tr
              key={row.key}
              data-slot="rate-row"
              className={cn(small && "text-muted-foreground")}
            >
              <th
                scope="row"
                data-slot="group"
                className="w-24 py-1.5 pr-3 text-left align-middle font-normal break-words sm:w-36"
              >
                {row.label}
              </th>
              <td className="py-1.5">
                <div className="flex items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                  >
                    {row.rate !== null && max > 0 && (
                      <div
                        data-slot="bar"
                        className={cn(
                          "h-full origin-left animate-bar-grow rounded-full bg-chart-2 motion-reduce:animate-none",
                          small && "opacity-50",
                        )}
                        style={{
                          width: `${(row.rate / max) * 100}%`,
                          animationDelay: `${i * STAGGER_MS}ms`,
                        }}
                      />
                    )}
                  </div>
                  <span
                    data-slot="rate-value"
                    className="w-10 shrink-0 text-right"
                  >
                    {formatRate(row.rate, lang)}
                  </span>
                </div>
                {small && (
                  <p data-slot="sample" className="text-right text-xs">
                    {t("statsSample").replace("{0}", formatCount(row.n, lang))}
                  </p>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
