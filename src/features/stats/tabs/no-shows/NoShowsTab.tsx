import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { useLanguage } from "@/lib/i18n";
import { useNoShowStats } from "../../api/useNoShowStats";
import { ChartCard } from "../../components/ChartCard";
import { ChartEmptyNote } from "../../components/ChartEmptyNote";
import { HeadlineStat } from "../../components/HeadlineStat";
import { StatsEmptyState } from "../../components/StatsEmptyState";
import { StatsTabGate } from "../../components/StatsTabGate";
import { ViewToggle } from "../../components/ViewToggle";
import { useComparisonLine } from "../../hooks/useComparisonLine";
import { useUrlView } from "../../hooks/useUrlView";
import { useGroupLabels } from "../../lib/groupLabels";
import { headlineGrid } from "../../lib/headlineGrid";
import {
  formatCount,
  formatRate,
  percentChange,
  pointChange,
} from "../../lib/statsFormat";
import type { StatsPeriodChoice } from "../../lib/statsPeriod";
import type { StatsTabProps } from "../../lib/statsTab";
import { EventRateChart } from "./EventRateChart";
import { NoShowGuestList } from "./NoShowGuestList";
import { NO_SHOW_VIEWS, noShowRateRows, type NoShowGroup } from "./noShowShare";
import { RateCard } from "./RateCard";

type NoShows = components["schemas"]["NoShowStatsPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 3;

function NoShowsContent({
  data,
  single,
  period,
}: {
  data: NoShows;
  single: boolean;
  period: StatsPeriodChoice;
}) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const { summary, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind, period);
  const [view, setView] = useUrlView("noshow_view", NO_SHOW_VIEWS, "rate");

  if (summary.expected === 0) return <StatsEmptyState />;

  // One event: the period rate is its average. The counts are period
  // totals then, so they only compare against the previous period.
  const compareRate = comparison
    ? line({
        unit: "points",
        change: pointChange(summary.no_show_rate, comparison.no_show_rate),
        average:
          comparison.no_show_rate === null
            ? undefined
            : formatRate(comparison.no_show_rate, lang),
      })
    : undefined;
  const compareCount = (current: number, previous: number | undefined) =>
    previous === undefined
      ? undefined
      : line({ unit: "percent", change: percentChange(current, previous) });

  const rateRows = <K extends string | null>(
    groups: NoShowGroup<K>[],
    label: (key: K) => string,
  ) => noShowRateRows(groups, label, view);

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        <HeadlineStat
          data-cy="stats-headline-no-show-rate"
          label={t("statsNoShowRate")}
          value={formatRate(summary.no_show_rate, lang)}
          comparison={compareRate}
          n={summary.expected}
        />
        <HeadlineStat
          data-cy="stats-headline-no-show-count"
          label={t("statsNoShowCount")}
          value={formatCount(summary.no_show, lang)}
          subline={t("statsNoShowOfExpected").replace(
            "{0}",
            formatCount(summary.expected, lang),
          )}
          comparison={compareCount(summary.no_show, comparison?.no_show)}
        />
        <HeadlineStat
          data-cy="stats-headline-repeat-no-shows"
          label={t("statsRepeatNoShows")}
          value={formatCount(summary.repeat_guests, lang)}
          subline={t(
            single ? "statsRepeatNoShowsEvent" : "statsRepeatNoShowsPeriod",
          )}
          comparison={compareCount(
            summary.repeat_guests,
            comparison?.repeat_guests,
          )}
        />
      </div>
      <StatsNote>{t("statsNoteNoShows")}</StatsNote>
      {!single && (
        <ChartCard title={t("statsNoShowByEvent")}>
          {(headingId) => (
            <EventRateChart meetups={data.meetups} labelledBy={headingId} />
          )}
        </ChartCard>
      )}
      <ViewToggle
        data-cy="stats-noshow-view"
        label={t("statsViewLabel")}
        options={[
          { value: "rate", label: t("statsViewRate") },
          { value: "share", label: t("statsViewShare") },
        ]}
        value={view}
        onChange={setView}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <RateCard
          title={t("statsNoShowByGender")}
          rows={rateRows(data.gender, labels.gender)}
          view={view}
        />
        <RateCard
          title={t("statsNoShowByAge")}
          rows={rateRows(data.age, labels.age)}
          view={view}
        />
        <RateCard
          title={t("statsNoShowByHistory")}
          rows={rateRows(data.history, labels.history)}
          view={view}
        />
        <RateCard
          title={t("statsNoShowByLeadTime")}
          rows={rateRows(
            data.lead_time.map((r) => ({
              key: r.bucket,
              expected: r.signed_up - r.cancelled,
              no_show: r.no_show,
              no_show_rate: r.no_show_rate,
            })),
            labels.leadTime,
          )}
          view={view}
        />
      </div>
      <StatsNote>{t("statsNoteNoShowHistory")}</StatsNote>
      <ChartCard
        title={t(single ? "statsNoShowGuestsEvent" : "statsNoShowGuests")}
      >
        {data.guests_total === 0 ? (
          <ChartEmptyNote data-cy="stats-noshow-guests-none">
            {t(single ? "statsNoShowGuestsNoneEvent" : "statsNoShowGuestsNone")}
          </ChartEmptyNote>
        ) : (
          <NoShowGuestList guests={data.guests} total={data.guests_total} />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteNoShowGuests")}</StatsNote>
      {single && <StatsNote>{t("statsNoteNoShowGuestsEvent")}</StatsNote>}
      {!single && <StatsNote>{t("statsNoteNoShowWeather")}</StatsNote>}
    </div>
  );
}

export function NoShowsTab({ orgId, query, period, onShowAll }: StatsTabProps) {
  const statsQ = useNoShowStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={HEADLINE_CARDS}
      tab="no-shows"
      onShowAll={onShowAll}
    >
      {(data) => <NoShowsContent data={data} single={single} period={period} />}
    </StatsTabGate>
  );
}
