import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { StatsNote } from "@/components/StatsNote";
import { useNoShowStats } from "@/hooks/useNoShowStats";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { BAR_END_UP } from "./chartMarks";
import { ChartTextTable } from "./ChartTextTable";
import { useGroupLabels } from "./groupLabels";
import { HeadlineStat } from "./HeadlineStat";
import { headlineGrid } from "./headlineGrid";
import { RateBars, type RateRow } from "./RateBars";
import { StatsLink } from "./StatsLink";
import { StatsListMore } from "./StatsListMore";
import {
  formatCount,
  formatEventDay,
  formatRate,
  percentChange,
  pointChange,
  shareTicks,
  sortByDate,
  spansYears,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import { useComparisonLine } from "./useComparisonLine";

type NoShows = components["schemas"]["NoShowStatsPublic"];
type NoShowGuest = components["schemas"]["NoShowGuestPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 3;

/** Sign-ups drawn as dots per guest; more show as a count. */
const MAX_DOTS = 12;

/** The no-show rate of each event of the period, oldest first. */
function EventRateChart({
  meetups,
  labelledBy,
}: {
  meetups: NoShows["meetups"];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    rate: { label: t("statsNoShowRate"), color: "var(--chart-2)" },
  };
  const withYear = spansYears(meetups.map((m) => m.date));
  const data = sortByDate(meetups).map((m) => ({
    name: m.name,
    day: formatEventDay(m.date, withYear),
    rate: m.no_show_rate ?? 0,
    m,
  }));
  const percent = (value: number) => formatRate(value, lang);
  const ticks = shareTicks(Math.max(0, ...data.map((d) => d.rate)));

  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
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
            width={40}
            domain={[0, ticks[ticks.length - 1]]}
            ticks={ticks}
            tickFormatter={percent}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => payload[0]?.payload?.name}
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">
                      {config[String(name)]?.label}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {percent(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="rate" fill="var(--color-rate)" radius={BAR_END_UP} />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsEventHeader"),
          t("statsDateHeader"),
          t("statsSignedUpHeader"),
          t("statsNoShowRate"),
        ]}
        rows={data.map(({ m, day }) => ({
          key: m.meetup_id,
          cells: [
            m.name,
            day,
            formatCount(m.expected, lang),
            formatRate(m.no_show_rate, lang),
          ],
        }))}
      />
    </>
  );
}

/** A card of rate bars, one per group. */
function RateCard({ title, rows }: { title: string; rows: RateRow[] }) {
  const { t } = useLanguage();
  return (
    <ChartCard title={title}>
      {(headingId) => (
        <RateBars
          rows={rows}
          groupHeader={t("statsGroupHeader")}
          rateHeader={t("statsNoShowRate")}
          labelledBy={headingId}
        />
      )}
    </ChartCard>
  );
}

/**
 * One dot per sign-up that was not cancelled: filled for each time the guest
 * did not come, hollow for each time they came. Past MAX_DOTS the rest is a
 * count. Decorative: the text beside it says the same.
 */
function MissDots({ guest }: { guest: NoShowGuest }) {
  const dots = [
    ...Array.from({ length: guest.no_show }, () => true),
    ...Array.from({ length: guest.attended }, () => false),
  ];
  const extra = dots.length - MAX_DOTS;

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center gap-1"
    >
      {dots.slice(0, MAX_DOTS).map((missed, i) => (
        <span
          key={i}
          data-slot={missed ? "dot-missed" : "dot-came"}
          className={cn(
            "size-2 rounded-full",
            missed
              ? "bg-chart-2"
              : "ring-1 ring-muted-foreground/60 ring-inset",
          )}
        />
      ))}
      {extra > 0 && (
        <span className="text-xs text-muted-foreground">+{extra}</span>
      )}
    </span>
  );
}

/** The guests who missed, most misses first, each linked to their guest page. */
function GuestList({
  guests,
  total,
}: {
  guests: NoShowGuest[];
  total: number;
}) {
  const { t, lang } = useLanguage();
  const withYear = spansYears(guests.map((g) => g.last_no_show));

  return (
    <>
      <ul className="divide-y text-sm">
        {guests.map((guest) => (
          <li
            key={guest.guest_id}
            data-slot="guest"
            className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <StatsLink to={`/guests/${guest.guest_id}`}>
              {guest.displayname}
            </StatsLink>
            <span className="flex items-center justify-between gap-3 text-muted-foreground tabular-nums">
              <span className="min-w-0">
                <span data-slot="missed">
                  {t("statsNoShowGuestMissed")
                    .replace("{0}", formatCount(guest.no_show, lang))
                    .replace("{1}", formatCount(guest.expected, lang))}
                </span>
                {", "}
                <span data-slot="last">
                  {t("statsNoShowGuestLast").replace(
                    "{0}",
                    formatEventDay(guest.last_no_show, withYear),
                  )}
                </span>
              </span>
              <MissDots guest={guest} />
            </span>
          </li>
        ))}
      </ul>
      <StatsListMore count={total - guests.length} slot="guests-more" />
    </>
  );
}

function NoShowsContent({ data, single }: { data: NoShows; single: boolean }) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const { summary, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind);

  if (summary.expected === 0) return <StatsEmptyState />;

  // One event: the period rate is its average. The counts are period
  // totals then, so they only compare against the previous period.
  const compareRate = comparison
    ? line({
        unit: "points",
        change: pointChange(summary.no_show_rate, comparison.no_show_rate),
        average: formatRate(comparison.no_show_rate, lang),
      })
    : undefined;
  const compareCount = (current: number, previous: number | undefined) =>
    previous === undefined
      ? undefined
      : line({ unit: "percent", change: percentChange(current, previous) });

  const rateRows = <K extends string | null>(
    groups: { key: K; expected: number; no_show_rate: number | null }[],
    label: (key: K) => string,
  ): RateRow[] =>
    groups.map((g) => ({
      key: String(g.key),
      label: label(g.key),
      rate: g.no_show_rate,
      n: g.expected,
    }));

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        <HeadlineStat
          label={t("statsNoShowRate")}
          value={formatRate(summary.no_show_rate, lang)}
          comparison={compareRate}
          n={summary.expected}
        />
        <HeadlineStat
          label={t("statsNoShowCount")}
          value={formatCount(summary.no_show, lang)}
          subline={t("statsNoShowOfExpected").replace(
            "{0}",
            formatCount(summary.expected, lang),
          )}
          comparison={compareCount(summary.no_show, comparison?.no_show)}
        />
        <HeadlineStat
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
      <div className="grid gap-3 lg:grid-cols-2">
        <RateCard
          title={t("statsNoShowByGender")}
          rows={rateRows(data.gender, labels.gender)}
        />
        <RateCard
          title={t("statsNoShowByAge")}
          rows={rateRows(data.age, labels.age)}
        />
        <RateCard
          title={t("statsNoShowByHistory")}
          rows={rateRows(data.history, labels.history)}
        />
        <RateCard
          title={t("statsNoShowByLeadTime")}
          rows={data.lead_time.map((r) => ({
            key: r.bucket,
            label: labels.leadTime(r.bucket),
            rate: r.no_show_rate,
            n: r.signed_up - r.cancelled,
          }))}
        />
      </div>
      <StatsNote>{t("statsNoteNoShowHistory")}</StatsNote>
      <ChartCard
        title={t(single ? "statsNoShowGuestsEvent" : "statsNoShowGuests")}
      >
        {data.guests_total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t(single ? "statsNoShowGuestsNoneEvent" : "statsNoShowGuestsNone")}
          </p>
        ) : (
          <GuestList guests={data.guests} total={data.guests_total} />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteNoShowGuests")}</StatsNote>
      {single && <StatsNote>{t("statsNoteNoShowGuestsEvent")}</StatsNote>}
      {!single && <StatsNote>{t("statsNoteNoShowWeather")}</StatsNote>}
    </div>
  );
}

export function NoShowsTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useNoShowStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={HEADLINE_CARDS}
      testId="no-shows-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <NoShowsContent data={data} single={single} />}
    </StatsTabGate>
  );
}
