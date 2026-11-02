import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { useLanguage } from "@/lib/i18n";
import { useAttendanceStats } from "../../api/useAttendanceStats";
import { ChartCard } from "../../components/ChartCard";
import { HeadlineStat } from "../../components/HeadlineStat";
import { StatsEmptyState } from "../../components/StatsEmptyState";
import { StatsTabGate } from "../../components/StatsTabGate";
import { useComparisonLine } from "../../hooks/useComparisonLine";
import { headlineGrid } from "../../lib/headlineGrid";
import {
  formatCount,
  formatRate,
  percentChange,
  pointChange,
} from "../../lib/statsFormat";
import type { StatsPeriodChoice } from "../../lib/statsPeriod";
import type { StatsTabProps } from "../../lib/statsTab";
import { AttendanceChart } from "./AttendanceChart";

type Attendance = components["schemas"]["AttendanceStatsPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const CARDS = { all: 6, single: 4 };

function AttendanceContent({
  data,
  single,
  period,
}: {
  data: Attendance;
  single: boolean;
  period: StatsPeriodChoice;
}) {
  const { t, lang } = useLanguage();
  const { meetups, totals, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind, period);
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
          data-cy="stats-headline-attended"
          label={t("statsAttended")}
          value={count(totals.attended)}
          comparison={compare(
            totals.attended,
            comparison?.attended,
            comparison ? count(comparison.avg_attended_per_event) : undefined,
          )}
        />
        <HeadlineStat
          data-cy="stats-headline-no-show-rate"
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
          data-cy="stats-headline-cancel-rate"
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
          data-cy="stats-headline-walkins"
          label={t("statsWalkins")}
          value={count(totals.walkin)}
          comparison={compare(totals.walkin, comparison?.walkin)}
        />
        {!single && (
          <>
            <HeadlineStat
              data-cy="stats-headline-events"
              label={t("statsEvents")}
              value={count(totals.events)}
              comparison={compare(totals.events, comparison?.events)}
            />
            <HeadlineStat
              data-cy="stats-headline-avg-per-event"
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

export function AttendanceTab({
  orgId,
  query,
  period,
  onShowAll,
}: StatsTabProps) {
  const statsQ = useAttendanceStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={single ? CARDS.single : CARDS.all}
      tab="attendance"
      onShowAll={onShowAll}
    >
      {(data) => (
        <AttendanceContent data={data} single={single} period={period} />
      )}
    </StatsTabGate>
  );
}
