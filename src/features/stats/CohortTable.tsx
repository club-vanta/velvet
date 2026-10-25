import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  formatCohortMonth,
  formatCount,
  formatRate,
  isSmallSample,
} from "./statsFormat";

type Cohort = components["schemas"]["CohortRowPublic"];

/** The months after the cohort month that the table has a column for. */
const MONTHS_AFTER = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * The tint of a share at 100%. Above half strength, `--chart-2` behind the
 * foreground text drops below 4.5:1 in dark mode.
 */
const MAX_TINT = 50;

function tint(rate: number): string {
  const pct = Math.round(Math.min(Math.max(rate, 0), 1) * MAX_TINT);
  return `color-mix(in oklch, var(--chart-2) ${pct}%, transparent)`;
}

/**
 * One row per month in which people came for the first time, with the share
 * of them who came back each month after. A cohort of few people is dimmed
 * and left untinted, since its shares say little. The month column stays in
 * view while the shares scroll sideways.
 */
export function CohortTable({
  cohorts,
  labelledBy,
}: {
  cohorts: Cohort[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const head = "px-2 py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <div className="overflow-x-auto">
      <table
        aria-labelledby={labelledBy}
        className="w-full text-sm tabular-nums"
      >
        <thead>
          <tr className="border-b">
            <th
              scope="col"
              className={cn(head, "sticky left-0 bg-card pl-0 text-left")}
            >
              {t("statsCohortMonth")}
            </th>
            <th scope="col" className={cn(head, "text-right")}>
              {t("statsCohortSize")}
            </th>
            {MONTHS_AFTER.map((m) => (
              <th key={m} scope="col" className={cn(head, "text-right")}>
                +{m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {cohorts.map((cohort) => {
            const small = isSmallSample(cohort.size);
            return (
              <tr
                key={cohort.month}
                className={cn(small && "text-muted-foreground")}
              >
                <th
                  scope="row"
                  data-slot="month"
                  className="sticky left-0 bg-card py-1.5 pr-2 text-left font-normal whitespace-nowrap"
                >
                  {formatCohortMonth(cohort.month, lang)}
                </th>
                <td data-slot="size" className="px-2 py-1.5 text-right">
                  {formatCount(cohort.size, lang)}
                </td>
                {MONTHS_AFTER.map((m) => {
                  const rate = cohort.retention.at(m - 1);
                  return (
                    <td
                      key={m}
                      data-slot="retention"
                      className="px-2 py-1.5 text-right"
                      style={
                        rate === undefined || small
                          ? undefined
                          : { backgroundColor: tint(rate) }
                      }
                    >
                      {rate === undefined ? null : formatRate(rate, lang)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
