import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useRetentionStats } from "@/hooks/useRetentionStats";
import { formatApiDate } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { ChartCard } from "./ChartCard";
import { BAR_END_UP, BAR_GAP } from "./chartMarks";
import { ChartTextTable } from "./ChartTextTable";
import { CohortTable } from "./CohortTable";
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "@/components/StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsLink } from "./StatsLink";
import { StatsListMore } from "./StatsListMore";
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

type Retention = components["schemas"]["RetentionStatsPublic"];
type FrequencyRow = components["schemas"]["FrequencyRowPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 3;

const FREQUENCY_LABELS: Record<FrequencyRow["bucket"], TranslationKey> = {
  ONE: "statsFreqOne",
  TWO: "statsFreqTwo",
  THREE_FIVE: "statsFreqThreeFive",
  SIX_PLUS: "statsFreqSixPlus",
};

/** New and returning people of each event, stacked. An event nobody came to keeps its empty slot. */
function NewReturningChart({
  meetups,
  labelledBy,
}: {
  meetups: Retention["meetups"];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    new: { label: t("statsSeriesNew"), color: "var(--chart-1)" },
    returning: { label: t("statsSeriesReturning"), color: "var(--chart-2)" },
  };
  const withYear = spansYears(meetups.map((m) => m.date));
  const sorted = sortByDate(meetups);
  const data = sorted.map((m) => ({
    ...m,
    day: formatEventDay(m.date, withYear),
  }));

  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
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
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload[0]?.payload?.name}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="new"
            stackId="people"
            fill="var(--color-new)"
            {...BAR_GAP}
          />
          <Bar
            dataKey="returning"
            stackId="people"
            fill="var(--color-returning)"
            radius={BAR_END_UP}
            {...BAR_GAP}
          />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsEventHeader"),
          t("statsDateHeader"),
          t("statsSeriesNew"),
          t("statsSeriesReturning"),
        ]}
        rows={sorted.map((m) => ({
          key: m.meetup_id,
          cells: [
            m.name,
            formatApiDate(m.date),
            formatCount(m.new, lang),
            formatCount(m.returning, lang),
          ],
        }))}
      />
    </>
  );
}

/** How many people came once, twice, and so on in the period. */
function FrequencyChart({
  rows,
  labelledBy,
}: {
  rows: FrequencyRow[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    guests: { label: t("statsPeople"), color: "var(--chart-1)" },
  };
  const data = rows.map((r) => ({
    label: t(FREQUENCY_LABELS[r.bucket]),
    guests: r.guests,
  }));

  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="guests"
            fill="var(--color-guests)"
            radius={BAR_END_UP}
          />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[t("statsFrequencyHeader"), t("statsPeople")]}
        rows={data.map((d) => ({
          key: d.label,
          cells: [d.label, formatCount(d.guests, lang)],
        }))}
      />
    </>
  );
}

/** Regulars who did not come in the period, each linked to their guest page. */
function LapsedList({
  lapsed,
  total,
}: {
  lapsed: Retention["lapsed"];
  total: number;
}) {
  const { t, lang } = useLanguage();
  const more = total - lapsed.length;

  return (
    <>
      <ul className="divide-y text-sm">
        {lapsed.map((guest) => (
          <li
            key={guest.guest_id}
            className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5"
          >
            <StatsLink to={`/guests/${guest.guest_id}`}>
              {guest.displayname}
            </StatsLink>
            <span className="text-muted-foreground tabular-nums">
              <span data-slot="times">
                {t("statsLapsedCame").replace(
                  "{0}",
                  formatCount(guest.attended_before, lang),
                )}
              </span>
              {" · "}
              <span data-slot="last">{formatApiDate(guest.last_attended)}</span>
            </span>
          </li>
        ))}
      </ul>
      <StatsListMore count={more} slot="lapsed-more" />
    </>
  );
}

function RetentionContent({
  data,
  single,
}: {
  data: Retention;
  single: boolean;
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
  } = data;
  const line = useComparisonLine(comparison_kind);

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

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        <HeadlineStat
          label={t("statsPeople")}
          value={formatCount(summary.attendees, lang)}
          comparison={compareAttendees()}
        />
        <HeadlineStat
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
        <HeadlineStat
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
      <StatsNote>{t("statsNoteRetention")}</StatsNote>
      <StatsNote>{t("statsNoteReturnRate")}</StatsNote>
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

export function RetentionTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useRetentionStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={HEADLINE_CARDS}
      testId="retention-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <RetentionContent data={data} single={single} />}
    </StatsTabGate>
  );
}
