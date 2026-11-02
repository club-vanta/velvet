import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { useLanguage } from "@/lib/i18n";
import { useArrivalsStats } from "../../api/useArrivalsStats";
import { ChartCard } from "../../components/ChartCard";
import { ChartEmptyNote } from "../../components/ChartEmptyNote";
import { HeadlineStat } from "../../components/HeadlineStat";
import { StatsEmptyState } from "../../components/StatsEmptyState";
import { StatsTabGate } from "../../components/StatsTabGate";
import { ViewToggle } from "../../components/ViewToggle";
import { useComparisonLine } from "../../hooks/useComparisonLine";
import { useUrlView } from "../../hooks/useUrlView";
import { headlineGrid } from "../../lib/headlineGrid";
import {
  formatClockWindow,
  formatCount,
  formatDuration,
  formatRate,
  minuteChange,
  NO_VALUE,
  pointChange,
} from "../../lib/statsFormat";
import type { StatsPeriodChoice } from "../../lib/statsPeriod";
import type { StatsTabProps } from "../../lib/statsTab";
import { ArrivalCurve } from "./ArrivalCurve";
import { CURVE_VIEWS } from "./curveView";
import { LeadTimeChart } from "./LeadTimeChart";
import { LeadTimeTable } from "./LeadTimeTable";

type Arrivals = components["schemas"]["ArrivalStatsPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 4;

function ArrivalsContent({
  data,
  single,
  period,
}: {
  data: Arrivals;
  single: boolean;
  period: StatsPeriodChoice;
}) {
  const { t, lang } = useLanguage();
  const { summary, lead_time, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind, period);
  const [curveView, setCurveView] = useUrlView(
    "arrivals_view",
    CURVE_VIEWS,
    "clock",
  );

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
      {summary.arrivals > 0 && (
        <ViewToggle
          label={t("statsViewLabel")}
          options={[
            { value: "clock", label: t("statsViewClock") },
            { value: "offset", label: t("statsViewFromStart") },
          ]}
          value={curveView}
          onChange={setCurveView}
        />
      )}
      <ChartCard title={t("statsArrivalCurve")}>
        {(headingId) =>
          summary.arrivals === 0 ? (
            <ChartEmptyNote>{t("statsNoArrivals")}</ChartEmptyNote>
          ) : (
            <ArrivalCurve data={data} view={curveView} labelledBy={headingId} />
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
            <ChartEmptyNote>{t("statsNoSignups")}</ChartEmptyNote>
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

export function ArrivalsTab({
  orgId,
  query,
  period,
  onShowAll,
}: StatsTabProps) {
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
      {(data) => (
        <ArrivalsContent data={data} single={single} period={period} />
      )}
    </StatsTabGate>
  );
}
