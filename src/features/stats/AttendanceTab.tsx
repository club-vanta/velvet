import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
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
import { ChartCard } from "./ChartCard";
import { HeadlineStat } from "./HeadlineStat";
import {
  formatChange,
  formatCount,
  formatEventDay,
  formatPointChange,
  formatRate,
} from "./statsFormat";
import { useStatsFilters } from "./useStatsFilters";

type Attendance = components["schemas"]["AttendanceStatsPublic"];

const SERIES = [
  { key: "attended", color: "var(--chart-1)" },
  { key: "no_show", color: "var(--chart-2)" },
  { key: "cancelled", color: "var(--chart-3)" },
] as const;

/** One layout for the skeleton and the cards, so nothing jumps on load. */
function headlineGrid(single: boolean): string {
  return cn(
    "grid grid-cols-2 gap-2 sm:gap-3",
    single ? "xl:grid-cols-4" : "xl:grid-cols-3",
  );
}

function ErrorState({
  onRetry,
  onShowAll,
}: {
  onRetry: () => void;
  onShowAll?: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10"
    >
      {t("failedLoadOrgStats")}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
        {onShowAll && (
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            {t("statsBackToAll")}
          </Button>
        )}
      </div>
    </div>
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

  const config: ChartConfig = {
    attended: { label: t("statsAttended"), color: SERIES[0].color },
    no_show: { label: t("statsNoShowRate"), color: SERIES[1].color },
    cancelled: { label: t("statsCancelRate"), color: SERIES[2].color },
  };
  // Naive ISO datetimes sort correctly as text.
  const data = [...meetups]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ ...m, day: formatEventDay(m.date) }));

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
  const legend = <ChartLegend content={<ChartLegendContent />} />;

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

export function AttendanceTab({ orgId }: { orgId: string }) {
  const { t, lang } = useLanguage();
  const { query, setMeetupId } = useStatsFilters();
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
      <ErrorState
        onRetry={() => statsQ.refetch()}
        onShowAll={query?.meetupId ? () => setMeetupId(undefined) : undefined}
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
          label={t("statsWalkinsHeadline")}
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
