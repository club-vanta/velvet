import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttendanceStats } from "@/hooks/useAttendanceStats";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { parseApiDateTime } from "@/lib/apiDateTime";
import { legendOrder, SERIES } from "./attendanceSeries";
import { ChartCard } from "./ChartCard";
import { HeadlineStat } from "./HeadlineStat";
import { StatsErrorState } from "./StatsErrorState";
import {
  formatChange,
  formatCount,
  formatEventDay,
  formatPointChange,
  formatRate,
  spansYears,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";

type Attendance = components["schemas"]["AttendanceStatsPublic"];

/** One layout for the skeleton and the cards, so nothing jumps on load. */
function headlineGrid(single: boolean): string {
  return cn(
    "grid grid-cols-2 gap-2 sm:gap-3",
    single ? "xl:grid-cols-4" : "xl:grid-cols-3",
  );
}

function AttendanceChart({
  meetups,
  single,
}: {
  meetups: Attendance["meetups"];
  single: boolean;
}) {
  const { t } = useLanguage();

  const config: ChartConfig = Object.fromEntries(
    SERIES.map(({ key, label, color }) => [key, { label: t(label), color }]),
  );
  const withYear = spansYears(meetups.map((m) => m.date));
  const data = meetups
    .map((m) => ({ ...m, time: parseApiDateTime(m.date).getTime() }))
    .sort((a, b) => a.time - b.time)
    .map((m) => ({ ...m, day: formatEventDay(m.date, withYear) }));

  const bars = SERIES.map(({ key }) => (
    <Bar
      key={key}
      dataKey={key}
      stackId="attendance"
      fill={`var(--color-${key})`}
    />
  ));
  const tooltip = (
    <ChartTooltip
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => payload[0]?.payload?.name}
        />
      }
    />
  );
  const legend = (
    <ChartLegend itemSorter={legendOrder} content={<ChartLegendContent />} />
  );

  return (
    <ChartContainer
      config={config}
      className={single ? "aspect-auto h-32 w-full" : "aspect-auto h-64 w-full"}
    >
      {single ? (
        <BarChart data={data} layout="vertical">
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="day" hide />
          {tooltip}
          {legend}
          {bars}
        </BarChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          {tooltip}
          {legend}
          {bars}
        </BarChart>
      )}
    </ChartContainer>
  );
}

export function AttendanceTab({ orgId, query, onShowAll }: StatsTabProps) {
  const { t, lang } = useLanguage();
  const statsQ = useAttendanceStats(orgId, query);
  const single = !!query?.meetupId;

  if (statsQ.isPending) {
    return (
      <div data-testid="attendance-skeleton" className="space-y-3">
        <div className={headlineGrid(single)}>
          {Array.from({ length: single ? 4 : 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <StatsErrorState
        onRetry={() => statsQ.refetch()}
        onShowAll={query?.meetupId ? onShowAll : undefined}
      />
    );
  }

  const { meetups, totals, comparison, comparison_kind } = statsQ.data;
  if (meetups.length === 0) {
    return (
      <p className="rounded-xl px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        {t("statsEmptyPeriod")}
      </p>
    );
  }

  /** The line under a number: change vs. the previous period, or the period average. */
  function compare(
    current: number | null,
    baseline: number | null | undefined,
    average?: string,
    unit: "percent" | "points" = "percent",
  ): string | undefined {
    if (comparison_kind === "PERIOD_AVERAGE") {
      return average === undefined
        ? undefined
        : t("statsPeriodAverage").replace("{0}", average);
    }
    if (comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const points = unit === "points";
    const change = points
      ? formatPointChange(current, baseline ?? null)
      : formatChange(current, baseline ?? null);
    if (change === null) return undefined;
    const signed = `${change > 0 ? "+" : ""}${change}`;
    return t(points ? "statsVsPreviousPts" : "statsVsPrevious").replace(
      "{0}",
      points ? signed : `${signed}%`,
    );
  }

  const rate = (value: number | null) => formatRate(value, lang);
  const count = (value: number | null) => formatCount(value, lang);

  return (
    <div className="space-y-3">
      <div className={headlineGrid(single)}>
        <HeadlineStat
          label={t("statsAttended")}
          value={count(totals.attended)}
          comparison={compare(
            totals.attended,
            comparison?.attended,
            comparison ? count(comparison.avg_attended_per_event) : undefined,
          )}
        />
        <HeadlineStat
          label={t("statsNoShowRate")}
          value={rate(totals.no_show_rate)}
          comparison={compare(
            totals.no_show_rate,
            comparison?.no_show_rate,
            comparison ? rate(comparison.no_show_rate) : undefined,
            "points",
          )}
          n={totals.signed_up - totals.cancelled}
        />
        <HeadlineStat
          label={t("statsCancelRate")}
          value={rate(totals.cancellation_rate)}
          comparison={compare(
            totals.cancellation_rate,
            comparison?.cancellation_rate,
            comparison ? rate(comparison.cancellation_rate) : undefined,
            "points",
          )}
          n={totals.signed_up}
        />
        <HeadlineStat
          label={t("statsWalkins")}
          value={count(totals.walkin)}
          comparison={compare(totals.walkin, comparison?.walkin)}
        />
        {!single && (
          <>
            <HeadlineStat
              label={t("statsEvents")}
              value={count(totals.events)}
              comparison={compare(totals.events, comparison?.events)}
            />
            <HeadlineStat
              label={t("statsAvgPerEvent")}
              value={count(totals.avg_attended_per_event)}
              comparison={compare(
                totals.avg_attended_per_event,
                comparison?.avg_attended_per_event,
              )}
            />
          </>
        )}
      </div>
      <ChartCard title={t("statsAttendanceChart")}>
        <AttendanceChart meetups={meetups} single={single} />
      </ChartCard>
    </div>
  );
}
