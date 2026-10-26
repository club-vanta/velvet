import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAttendanceStats } from "@/hooks/useAttendanceStats";
import { formatApiDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { legendOrder, SERIES } from "./attendanceSeries";
import { ChartCard } from "./ChartCard";
import { BAR_GAP } from "./chartMarks";
import { ChartTextTable } from "./ChartTextTable";
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "@/components/StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  percentChange,
  formatCount,
  formatEventDay,
  pointChange,
  formatRate,
  sortByDate,
  spansYears,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { useComparisonLine } from "./useComparisonLine";

type Attendance = components["schemas"]["AttendanceStatsPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const CARDS = { all: 6, single: 4 };

function AttendanceChart({
  meetups,
  single,
  labelledBy,
}: {
  meetups: Attendance["meetups"];
  single: boolean;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();

  const config: ChartConfig = Object.fromEntries(
    SERIES.map(({ key, label, color }) => [key, { label: t(label), color }]),
  );
  const withYear = spansYears(meetups.map((m) => m.date));
  const sorted = sortByDate(meetups);
  const data = sorted.map((m) => ({
    ...m,
    day: formatEventDay(m.date, withYear),
  }));

  const bars = SERIES.map(({ key }) => (
    <Bar
      key={key}
      dataKey={key}
      stackId="attendance"
      fill={`var(--color-${key})`}
      {...BAR_GAP}
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
    <>
      <ChartContainer
        config={config}
        className={
          single ? "aspect-auto h-32 w-full" : "aspect-auto h-64 w-full"
        }
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
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsEventHeader"),
          t("statsDateHeader"),
          ...SERIES.map(({ label }) => t(label)),
        ]}
        rows={sorted.map((m) => ({
          key: m.meetup_id,
          cells: [
            m.name,
            formatApiDate(m.date),
            ...SERIES.map(({ key }) => formatCount(m[key], lang)),
          ],
        }))}
      />
    </>
  );
}

function AttendanceContent({
  data,
  single,
}: {
  data: Attendance;
  single: boolean;
}) {
  const { t, lang } = useLanguage();
  const { meetups, totals, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind);
  if (meetups.length === 0) {
    return <StatsEmptyState />;
  }

  /** The line under a number: change vs. the previous period, or the period average. */
  function compare(
    current: number | null,
    baseline: number | null | undefined,
    average?: string,
    unit: "percent" | "points" = "percent",
  ): string | undefined {
    return line({
      unit,
      average,
      change:
        unit === "points"
          ? pointChange(current, baseline ?? null)
          : percentChange(current, baseline ?? null),
    });
  }

  const cards = single ? CARDS.single : CARDS.all;
  const rate = (value: number | null) => formatRate(value, lang);
  const count = (value: number | null) => formatCount(value, lang);

  return (
    <div className="space-y-3">
      <div className={headlineGrid(cards)}>
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
        {(headingId) => (
          <AttendanceChart
            meetups={meetups}
            single={single}
            labelledBy={headingId}
          />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteAttendance")}</StatsNote>
    </div>
  );
}

export function AttendanceTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useAttendanceStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={single ? CARDS.single : CARDS.all}
      testId="attendance-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <AttendanceContent data={data} single={single} />}
    </StatsTabGate>
  );
}
