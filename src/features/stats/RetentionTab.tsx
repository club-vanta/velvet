import { Link } from "react-router-dom";
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
import { parseApiDateTime } from "@/lib/apiDateTime";
import { formatDate } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { ChartCard } from "./ChartCard";
import { CohortTable } from "./CohortTable";
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "./StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatChange,
  formatCount,
  formatEventDay,
  formatPointChange,
  formatRate,
  spansYears,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";

type Retention = components["schemas"]["RetentionStatsPublic"];
type FrequencyRow = components["schemas"]["FrequencyRowPublic"];

const FREQUENCY_LABELS: Record<FrequencyRow["bucket"], TranslationKey> = {
  ONE: "statsFreqOne",
  TWO: "statsFreqTwo",
  THREE_FIVE: "statsFreqThreeFive",
  SIX_PLUS: "statsFreqSixPlus",
};

/** New and returning people of each event, stacked. An event nobody came to keeps its empty slot. */
function NewReturningChart({ meetups }: { meetups: Retention["meetups"] }) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    new: { label: t("statsSeriesNew"), color: "var(--chart-1)" },
    returning: { label: t("statsSeriesReturning"), color: "var(--chart-2)" },
  };
  const withYear = spansYears(meetups.map((m) => m.date));
  const data = meetups.map((m) => ({
    ...m,
    day: formatEventDay(m.date, withYear),
  }));

  return (
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
        <Bar dataKey="new" stackId="people" fill="var(--color-new)" />
        <Bar
          dataKey="returning"
          stackId="people"
          fill="var(--color-returning)"
        />
      </BarChart>
    </ChartContainer>
  );
}

/** How many people came once, twice, and so on in the period. */
function FrequencyChart({ rows }: { rows: FrequencyRow[] }) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    guests: { label: t("statsPeople"), color: "var(--chart-1)" },
  };
  const data = rows.map((r) => ({
    label: t(FREQUENCY_LABELS[r.bucket]),
    guests: r.guests,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="guests" fill="var(--color-guests)" />
      </BarChart>
    </ChartContainer>
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
            <Link
              to={`/guests/${guest.guest_id}`}
              className="min-w-0 rounded-sm font-medium break-words underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {guest.displayname}
            </Link>
            <span className="text-muted-foreground tabular-nums">
              <span data-slot="times">
                {t("statsLapsedCame").replace(
                  "{0}",
                  formatCount(guest.attended_before, lang),
                )}
              </span>
              {" · "}
              <span data-slot="last">
                {formatDate(
                  parseApiDateTime(guest.last_attended).toISOString(),
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p
          data-slot="lapsed-more"
          className="pt-2 text-sm text-muted-foreground"
        >
          {t("statsLapsedMore").replace("{0}", formatCount(more, lang))}
        </p>
      )}
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

  if (summary.attendees === 0) {
    return <StatsEmptyState />;
  }

  // The comparison's count is a period total for one event, so it only
  // compares against the previous period.
  function compareAttendees(): string | undefined {
    if (!comparison || comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const change = formatChange(summary.attendees, comparison.attendees);
    return change === null
      ? undefined
      : t("statsVsPrevious").replace(
          "{0}",
          `${change > 0 ? "+" : ""}${change}%`,
        );
  }

  function compareReturnRate(): string | undefined {
    if (!comparison) return undefined;
    if (comparison_kind === "PERIOD_AVERAGE") {
      return t("statsPeriodAverage").replace(
        "{0}",
        formatRate(comparison.first_timer_return_rate, lang),
      );
    }
    const change = formatPointChange(
      summary.first_timer_return_rate,
      comparison.first_timer_return_rate,
    );
    if (change === null) return undefined;
    return t("statsVsPreviousPts").replace(
      "{0}",
      `${change > 0 ? "+" : ""}${change}`,
    );
  }

  const returnRate = summary.first_timer_return_rate;

  return (
    <div className="space-y-3">
      <div className={headlineGrid(3)}>
        <HeadlineStat
          label={t("statsPeople")}
          value={formatCount(summary.attendees, lang)}
          comparison={compareAttendees()}
        />
        <HeadlineStat
          label={t("statsFirstTime")}
          value={formatCount(summary.new_guests, lang)}
          comparison={
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
          comparison={compareReturnRate()}
          n={returnRate === null ? undefined : summary.new_guests}
        />
      </div>
      {single && returnRate !== null && (
        <p data-slot="event-came-back" className="text-sm">
          {t("statsEventCameBack").replace("{0}", formatRate(returnRate, lang))}
        </p>
      )}
      <StatsNote>{t("statsNoteRetention")}</StatsNote>
      <StatsNote>{t("statsNoteReturnRate")}</StatsNote>
      {!single && (
        <>
          <ChartCard title={t("statsNewReturning")}>
            <NewReturningChart meetups={meetups} />
          </ChartCard>
          <ChartCard title={t("statsFrequency")}>
            <FrequencyChart rows={frequency} />
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
          {lapsed_total !== null && lapsed.length > 0 && (
            <>
              <ChartCard title={t("statsLapsed")}>
                <LapsedList lapsed={lapsed} total={lapsed_total} />
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
      cards={3}
      testId="retention-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <RetentionContent data={data} single={single} />}
    </StatsTabGate>
  );
}
