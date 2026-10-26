import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useArrivalsStats } from "@/hooks/useArrivalsStats";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { useGroupLabels } from "./groupLabels";
import { BAR_END_RIGHT, BAR_END_UP, BAR_GAP } from "./chartMarks";
import { ChartTextTable } from "./ChartTextTable";
import { HeadlineStat } from "./HeadlineStat";
import { RateCell } from "./RateCell";
import { StatsNote } from "@/components/StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatClockWindow,
  formatCount,
  formatCurveLabel,
  formatDuration,
  minuteChange,
  pointChange,
  formatRate,
  NO_VALUE,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { useComparisonLine } from "./useComparisonLine";

type Arrivals = components["schemas"]["ArrivalStatsPublic"];
type LeadRow = components["schemas"]["LeadTimeRowPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 4;

function ArrivalCurve({
  curve,
  single,
  labelledBy,
}: {
  curve: Arrivals["curve"];
  single: boolean;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    arrivals: { label: t("statsArrivalsSeries"), color: "var(--chart-1)" },
  };
  const data = curve.map((b) => ({
    label: formatCurveLabel(b, single),
    arrivals: b.arrivals,
  }));

  return (
    <>
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
          <Bar
            dataKey="arrivals"
            fill="var(--color-arrivals)"
            radius={BAR_END_UP}
            {...BAR_GAP}
          />
        </BarChart>
      </ChartContainer>
      {!single && (
        <p className="text-center text-xs text-muted-foreground">
          {t("statsArrivalAxisFromStart")}
        </p>
      )}
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[t("statsArrivalTimeHeader"), t("statsArrivalsSeries")]}
        rows={data.map(({ label, arrivals }) => ({
          key: label,
          cells: [label, formatCount(arrivals, lang)],
        }))}
      />
    </>
  );
}

function LeadTimeChart({ rows }: { rows: LeadRow[] }) {
  const { t } = useLanguage();
  const labels = useGroupLabels();
  const config: ChartConfig = {
    signed_up: { label: t("statsSeriesSignedUp"), color: "var(--chart-2)" },
  };
  const data = rows.map((r) => ({
    label: labels.leadTime(r.bucket),
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
        <Bar
          dataKey="signed_up"
          fill="var(--color-signed_up)"
          radius={BAR_END_RIGHT}
        />
      </BarChart>
    </ChartContainer>
  );
}

/** Sign-ups and the no-show rate of each lead-time bucket; a rate from few people is dimmed with its n. */
function LeadTimeTable({
  rows,
  labelledBy,
}: {
  rows: LeadRow[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const head = "py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <table
      aria-labelledby={labelledBy}
      className="mt-3 w-full text-sm tabular-nums"
    >
      <thead>
        <tr className="border-b">
          <th scope="col" className={cn(head, "text-left")}>
            {t("statsLeadTimeHeader")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsSeriesSignedUp")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsNoShowRate")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.bucket} data-slot="lead-row">
            <th
              scope="row"
              data-slot="bucket"
              className="py-1.5 text-left font-normal"
            >
              {labels.leadTime(r.bucket)}
            </th>
            <td data-slot="signed-up" className="py-1.5 text-right">
              {formatCount(r.signed_up, lang)}
            </td>
            <RateCell rate={r.no_show_rate} n={r.signed_up - r.cancelled} />
          </tr>
        ))}
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
  const line = useComparisonLine(comparison_kind);

  if (summary.arrivals === 0 && lead_time.every((r) => r.signed_up === 0)) {
    return <StatsEmptyState />;
  }

  /** How long before or after the start: the line under a clock time. */
  function fromStart(minutes: number | null): string | undefined {
    if (minutes === null) return undefined;
    if (minutes === 0) return t("statsAtStart");
    const key = minutes > 0 ? "statsAfterStart" : "statsBeforeStart";
    return t(key).replace("{0}", formatDuration(minutes, t));
  }

  /** One event: the period's clock time; aggregate: the change in minutes from the start. */
  function compareTime(
    current: number | null,
    baseline: number | null | undefined,
    baselineClock: string | null | undefined,
  ): string | undefined {
    return line({
      unit: "minutes",
      change: minuteChange(current, baseline ?? null),
      average: baselineClock ?? undefined,
    });
  }

  function compareShare(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "points",
      change: pointChange(
        summary.first_hour_share,
        comparison.first_hour_share,
      ),
      average: formatRate(comparison.first_hour_share, lang),
    });
  }

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        <HeadlineStat
          label={t("statsMeanArrival")}
          value={summary.mean_local_time ?? NO_VALUE}
          subline={fromStart(summary.mean_minutes)}
          comparison={compareTime(
            summary.mean_minutes,
            comparison?.mean_minutes,
            comparison?.mean_local_time,
          )}
        />
        <HeadlineStat
          label={t("statsBusiestQuarter")}
          value={
            summary.peak_local_time
              ? formatClockWindow(summary.peak_local_time)
              : NO_VALUE
          }
          subline={fromStart(summary.peak?.start_minute ?? null)}
        />
        <HeadlineStat
          label={t("statsNinetyArrived")}
          value={summary.p90_local_time ?? NO_VALUE}
          subline={fromStart(summary.p90_minutes)}
          comparison={compareTime(
            summary.p90_minutes,
            comparison?.p90_minutes,
            comparison?.p90_local_time,
          )}
        />
        <HeadlineStat
          label={t("statsFirstHour")}
          value={formatRate(summary.first_hour_share, lang)}
          comparison={compareShare()}
          n={summary.first_hour_share === null ? undefined : summary.arrivals}
        />
      </div>
      <ChartCard title={t("statsArrivalCurve")}>
        {(headingId) =>
          summary.arrivals === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("statsNoArrivals")}
            </p>
          ) : (
            <ArrivalCurve
              curve={curve}
              single={single}
              labelledBy={headingId}
            />
          )
        }
      </ChartCard>
      <StatsNote>{t("statsNoteArrivals")}</StatsNote>
      {!single && <StatsNote>{t("statsNoteArrivalClock")}</StatsNote>}
      {summary.excluded_arrivals > 0 && (
        <StatsNote>
          {t("statsNoteExcludedArrivals").replace(
            "{0}",
            formatCount(summary.excluded_arrivals, lang),
          )}
        </StatsNote>
      )}
      <ChartCard title={t("statsLeadTime")}>
        {(headingId) =>
          lead_time.every((r) => r.signed_up === 0) ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("statsNoSignups")}
            </p>
          ) : (
            <>
              <LeadTimeChart rows={lead_time} />
              <LeadTimeTable rows={lead_time} labelledBy={headingId} />
            </>
          )
        }
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
      cards={HEADLINE_CARDS}
      testId="arrivals-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <ArrivalsContent data={data} single={single} />}
    </StatsTabGate>
  );
}
