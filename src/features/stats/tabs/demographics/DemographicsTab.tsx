import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { useLanguage } from "@/lib/i18n";
import { useDemographicsStats } from "../../api/useDemographicsStats";
import { ChartCard } from "../../components/ChartCard";
import { HeadlineStat } from "../../components/HeadlineStat";
import { StatsEmptyState } from "../../components/StatsEmptyState";
import { StatsTabGate } from "../../components/StatsTabGate";
import { useComparisonLine } from "../../hooks/useComparisonLine";
import { useGroupLabels } from "../../lib/groupLabels";
import { headlineGrid } from "../../lib/headlineGrid";
import {
  formatAge,
  formatCount,
  formatRate,
  percentChange,
  pointChange,
  yearsChange,
} from "../../lib/statsFormat";
import type { StatsPeriodChoice } from "../../lib/statsPeriod";
import type { StatsTabProps } from "../../lib/statsTab";
import { ShareChart } from "./ShareChart";

type Demographics = components["schemas"]["DemographicStatsPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 3;

function DemographicsContent({
  data,
  period,
}: {
  data: Demographics;
  period: StatsPeriodChoice;
}) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const { gender, age, summary, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind, period);

  if (summary.attended === 0) {
    return <StatsEmptyState />;
  }

  /** One event: the period average; aggregate: the change vs. the previous period. */
  function compareAge(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "years",
      change: yearsChange(summary.median_age, comparison.median_age),
      average:
        comparison.median_age === null
          ? undefined
          : formatAge(comparison.median_age, lang),
    });
  }

  function compareKnown(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "points",
      change: pointChange(summary.known_age_share, comparison.known_age_share),
      average: formatRate(comparison.known_age_share, lang),
    });
  }

  // The comparison's count is a period total for one event, so it has no
  // average and only compares against the previous period.
  function compareAttended(): string | undefined {
    if (!comparison) return undefined;
    return line({
      unit: "percent",
      change: percentChange(summary.attended, comparison.attended),
    });
  }

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        <HeadlineStat
          data-cy="stats-headline-median-age"
          label={t("statsMedianAge")}
          value={formatAge(summary.median_age, lang)}
          comparison={compareAge()}
        />
        <HeadlineStat
          data-cy="stats-headline-known-age"
          label={t("statsKnownAge")}
          value={formatRate(summary.known_age_share, lang)}
          comparison={compareKnown()}
          n={summary.known_age_share === null ? undefined : summary.attended}
        />
        <HeadlineStat
          data-cy="stats-headline-attendances"
          label={t("statsAttendances")}
          value={formatCount(summary.attended, lang)}
          comparison={compareAttended()}
        />
      </div>
      <ChartCard title={t("statsGender")}>
        {(headingId) => (
          <ShareChart
            groups={gender}
            label={labels.gender}
            bars="horizontal"
            labelledBy={headingId}
          />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteGender")}</StatsNote>
      <ChartCard title={t("statsAge")}>
        {(headingId) => (
          <ShareChart
            groups={age}
            label={labels.age}
            bars="vertical"
            labelledBy={headingId}
          />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteAge")}</StatsNote>
    </div>
  );
}

export function DemographicsTab({
  orgId,
  query,
  period,
  onShowAll,
}: StatsTabProps) {
  const statsQ = useDemographicsStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={HEADLINE_CARDS}
      tab="demographics"
      onShowAll={onShowAll}
    >
      {(data) => <DemographicsContent data={data} period={period} />}
    </StatsTabGate>
  );
}
