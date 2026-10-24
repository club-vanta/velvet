import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useArrivalsStats } from "@/hooks/useArrivalsStats";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "./StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatCurveLabel,
  formatMinuteChange,
  formatOffset,
  formatPointChange,
  formatRate,
  isSmallSample,
  NO_VALUE,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";

type Arrivals = components["schemas"]["ArrivalStatsPublic"];
type LeadRow = components["schemas"]["LeadTimeRowPublic"];

const LEAD_LABELS: Record<LeadRow["bucket"], TranslationKey> = {
  SAME_DAY: "statsLeadSameDay",
  ONE_DAY: "statsLeadOneDay",
  TWO_THREE: "statsLeadTwoThree",
  FOUR_SEVEN: "statsLeadFourSeven",
  EIGHT_FOURTEEN: "statsLeadEightFourteen",
  FIFTEEN_PLUS: "statsLeadFifteenPlus",
};

function ArrivalCurve({
  curve,
  single,
}: {
  curve: Arrivals["curve"];
  single: boolean;
}) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    arrivals: { label: t("statsArrivalsSeries"), color: "var(--chart-1)" },
  };
  const data = curve.map((b) => ({
    label: formatCurveLabel(b, single),
    arrivals: b.arrivals,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="arrivals" fill="var(--color-arrivals)" />
      </BarChart>
    </ChartContainer>
  );
}

function LeadTimeChart({ rows }: { rows: LeadRow[] }) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    signed_up: { label: t("statsSeriesSignedUp"), color: "var(--chart-2)" },
  };
  const data = rows.map((r) => ({
    label: t(LEAD_LABELS[r.bucket]),
    signed_up: r.signed_up,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={80}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="signed_up" fill="var(--color-signed_up)" />
      </BarChart>
    </ChartContainer>
  );
}

/** Sign-ups and the no-show rate of each lead-time bucket; a rate from few people is dimmed with its n. */
function LeadTimeTable({ rows }: { rows: LeadRow[] }) {
  const { t, lang } = useLanguage();
  const head = "py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <table className="mt-3 w-full text-sm tabular-nums">
      <thead>
        <tr className="border-b">
          <th scope="col" className={cn(head, "text-left")}>
            {t("statsLeadTimeHeader")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsRsvps")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsNoShowRate")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => {
          const n = r.signed_up - r.cancelled;
          const small = r.no_show_rate !== null && isSmallSample(n);
          return (
            <tr key={r.bucket} data-slot="lead-row">
              <th
                scope="row"
                data-slot="bucket"
                className="py-1.5 text-left font-normal"
              >
                {t(LEAD_LABELS[r.bucket])}
              </th>
              <td data-slot="signed-up" className="py-1.5 text-right">
                {r.signed_up}
              </td>
              <td
                data-slot="rate"
                className={cn(
                  "py-1.5 text-right",
                  small && "text-muted-foreground",
                )}
              >
                {formatRate(r.no_show_rate, lang)}
                {small && (
                  <span data-slot="sample" className="ml-2 text-xs">
                    {t("statsSample").replace("{0}", String(n))}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ArrivalsContent({
  data,
  single,
}: {
  data: Arrivals;
  single: boolean;
}) {
  const { t, lang } = useLanguage();
  const { curve, summary, lead_time, comparison, comparison_kind } = data;

  if (summary.arrivals === 0 && lead_time.every((r) => r.signed_up === 0)) {
    return <StatsEmptyState />;
  }

  /**
   * The line under a time. One event: its offset from the start (its card
   * shows a clock time) and the period average. Aggregate: the change vs. the
   * previous period.
   */
  function compareMinutes(
    current: number | null,
    baseline: number | null | undefined,
  ): string | undefined {
    if (comparison_kind === "PERIOD_AVERAGE") {
      const fromStart =
        current === null
          ? []
          : [t("statsFromStart").replace("{0}", formatOffset(current))];
      const average =
        baseline == null
          ? []
          : [t("statsPeriodAverage").replace("{0}", formatOffset(baseline))];
      const parts = [...fromStart, ...average];
      return parts.length > 0 ? parts.join(" · ") : undefined;
    }
    if (comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const change = formatMinuteChange(current, baseline ?? null);
    if (change === null) return undefined;
    return t("statsMinutesVsPrevious").replace(
      "{0}",
      `${change > 0 ? "+" : ""}${change}`,
    );
  }

  function compareShare(): string | undefined {
    if (!comparison) return undefined;
    if (comparison_kind === "PERIOD_AVERAGE") {
      return t("statsPeriodAverage").replace(
        "{0}",
        formatRate(comparison.first_hour_share, lang),
      );
    }
    if (comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const change = formatPointChange(
      summary.first_hour_share,
      comparison.first_hour_share,
    );
    if (change === null) return undefined;
    return t("statsVsPreviousPts").replace(
      "{0}",
      `${change > 0 ? "+" : ""}${change}`,
    );
  }

  const time = (local: string | null, minutes: number | null) =>
    (single ? local : null) ??
    (minutes === null ? NO_VALUE : formatOffset(minutes));
  const peak = summary.peak;

  return (
    <div className="space-y-3">
      <div className={headlineGrid(single)}>
        <HeadlineStat
          label={t("statsPeakArrival")}
          value={peak ? time(peak.local_time, peak.start_minute) : NO_VALUE}
        />
        <HeadlineStat
          label={t("statsHalfArrived")}
          value={time(summary.median_local_time, summary.median_minutes)}
          comparison={compareMinutes(
            summary.median_minutes,
            comparison?.median_minutes,
          )}
        />
        <HeadlineStat
          label={t("statsNinetyArrived")}
          value={time(summary.p90_local_time, summary.p90_minutes)}
          comparison={compareMinutes(
            summary.p90_minutes,
            comparison?.p90_minutes,
          )}
        />
        <HeadlineStat
          label={t("statsFirstHour")}
          value={formatRate(summary.first_hour_share, lang)}
          comparison={compareShare()}
          n={summary.arrivals}
        />
      </div>
      <ChartCard title={t("statsArrivalCurve")}>
        {summary.arrivals === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("statsNoArrivals")}
          </p>
        ) : (
          <ArrivalCurve curve={curve} single={single} />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteArrivals")}</StatsNote>
      <ChartCard title={t("statsLeadTime")}>
        {lead_time.every((r) => r.signed_up === 0) ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("statsNoSignups")}
          </p>
        ) : (
          <>
            <LeadTimeChart rows={lead_time} />
            <LeadTimeTable rows={lead_time} />
          </>
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteLeadTime")}</StatsNote>
    </div>
  );
}

export function ArrivalsTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useArrivalsStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={4}
      testId="arrivals-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <ArrivalsContent data={data} single={single} />}
    </StatsTabGate>
  );
}
