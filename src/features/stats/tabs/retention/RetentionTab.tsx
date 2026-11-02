import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { useLanguage } from "@/lib/i18n";
import { useRetentionStats } from "../../api/useRetentionStats";
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
import { CohortTable } from "./CohortTable";
import { FrequencyChart } from "./FrequencyChart";
import { LapsedList } from "./LapsedList";
import { NewReturningChart } from "./NewReturningChart";
import { NightCharts } from "./NightCharts";
import { isRegular } from "./nightCrowd";

type Retention = components["schemas"]["RetentionStatsPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 3;

function RetentionContent({
  data,
  single,
  allTime,
  period,
  meetupId,
}: {
  data: Retention;
  single: boolean;
  period: StatsPeriodChoice;
  meetupId: string | undefined;
  /**
   * Every guest's first time falls inside "all time", so "First time" would
   * always read 100%; the card shows who came only once instead.
   */
  allTime: boolean;
}) {
  const { t, lang } = useLanguage();
  const {
    summary,
    meetups,
    cohorts,
    frequency,
    lapsed,
    lapsed_total,
    comparison,
    comparison_kind,
    night,
  } = data;
  const line = useComparisonLine(comparison_kind, period);

  if (summary.attendees === 0) {
    return <StatsEmptyState />;
  }

  // The comparison's count is a period total for one event, so it has no
  // average and only compares against the previous period.
  function compareAttendees(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "percent",
      change: percentChange(summary.attendees, comparison.attendees),
    });
  }

  function compareReturnRate(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "points",
      change: pointChange(
        summary.first_timer_return_rate,
        comparison.first_timer_return_rate,
      ),
      average: formatRate(comparison.first_timer_return_rate, lang),
    });
  }

  const returnRate = summary.first_timer_return_rate;
  const cameOnce = summary.attendees - summary.came_back;
  const regulars = night?.guests.filter((g) => isRegular(g.visit)).length;

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        {/* For one event, how many came is on Asistencia already. */}
        {regulars === undefined ? (
          <HeadlineStat
            data-cy="stats-headline-people"
            label={t("statsPeople")}
            value={formatCount(summary.attendees, lang)}
            comparison={compareAttendees()}
          />
        ) : (
          <HeadlineStat
            data-cy="stats-headline-regulars"
            label={t("statsRegulars")}
            value={formatCount(regulars, lang)}
            subline={t("statsRegularsShare").replace(
              "{0}",
              formatRate(regulars / summary.attendees, lang),
            )}
          />
        )}
        {allTime ? (
          <HeadlineStat
            data-cy="stats-headline-came-once"
            label={t("statsCameOnce")}
            value={formatCount(cameOnce, lang)}
            subline={t("statsShareOfTotal").replace(
              "{0}",
              formatRate(cameOnce / summary.attendees, lang),
            )}
          />
        ) : (
          <HeadlineStat
            data-cy="stats-headline-first-time"
            label={t("statsFirstTime")}
            value={formatCount(summary.new_guests, lang)}
            subline={
              summary.new_share === null
                ? undefined
                : t("statsShareOfTotal").replace(
                    "{0}",
                    formatRate(summary.new_share, lang),
                  )
            }
          />
        )}
        <HeadlineStat
          data-cy="stats-headline-came-back"
          label={t("statsCameBack")}
          value={formatRate(returnRate, lang)}
          subline={
            single && returnRate !== null
              ? t("statsCameBackOfFirstTimers")
              : undefined
          }
          comparison={compareReturnRate()}
          n={returnRate === null ? undefined : summary.new_guests}
        />
      </div>
      {!allTime && <StatsNote>{t("statsNoteRetention")}</StatsNote>}
      <StatsNote>{t("statsNoteReturnRate")}</StatsNote>
      {night && (
        // Keyed by the event: a cached switch keeps the instance, and with it
        // a card left open over another night's faces.
        <NightCharts key={meetupId} night={night} />
      )}
      {!single && (
        <>
          <ChartCard title={t("statsNewReturning")}>
            {(headingId) => (
              <NewReturningChart meetups={meetups} labelledBy={headingId} />
            )}
          </ChartCard>
          <ChartCard title={t("statsFrequency")}>
            {(headingId) => (
              <FrequencyChart rows={frequency} labelledBy={headingId} />
            )}
          </ChartCard>
          {cohorts.length > 0 && (
            <>
              <ChartCard title={t("statsCohorts")}>
                {(headingId) => (
                  <CohortTable cohorts={cohorts} labelledBy={headingId} />
                )}
              </ChartCard>
              <StatsNote>{t("statsNoteCohorts")}</StatsNote>
            </>
          )}
          {lapsed_total !== null && (
            <>
              <ChartCard title={t("statsLapsed")}>
                {lapsed_total === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("statsLapsedNone")}
                  </p>
                ) : (
                  <LapsedList lapsed={lapsed} total={lapsed_total} />
                )}
              </ChartCard>
              <StatsNote>{t("statsNoteLapsed")}</StatsNote>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function RetentionTab({
  orgId,
  query,
  period,
  onShowAll,
}: StatsTabProps) {
  const statsQ = useRetentionStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={HEADLINE_CARDS}
      tab="retention"
      onShowAll={onShowAll}
    >
      {(data) => (
        <RetentionContent
          data={data}
          single={single}
          allTime={!single && !query?.from && !query?.to}
          period={period}
          meetupId={query?.meetupId}
        />
      )}
    </StatsTabGate>
  );
}
