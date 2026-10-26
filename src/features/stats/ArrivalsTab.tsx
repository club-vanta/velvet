import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useArrivalsStats } from "@/hooks/useArrivalsStats";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { ChartTextTable } from "./ChartTextTable";
import { HeadlineStat } from "./HeadlineStat";
import { RateCell } from "./RateCell";
import { StatsNote } from "@/components/StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatClockWindow,
  formatCount,
  formatCurveLabel,
  minuteChange,
  formatOffset,
  pointChange,
  formatRate,
  NO_VALUE,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { useComparisonLine } from "./useComparisonLine";

type Arrivals = components["schemas"]["ArrivalStatsPublic"];
type LeadRow = components["schemas"]["LeadTimeRowPublic"];

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 4;

const LEAD_LABELS: Record<LeadRow["bucket"], TranslationKey> = {
  SAME_DAY: "statsLeadSameDay",
  ONE_DAY: "statsLeadOneDay",
  TWO_THREE: "statsLeadTwoThree",
  FOUR_SEVEN: "statsLeadFourSeven",
  EIGHT_FOURTEEN: "statsLeadEightFourteen",
  FIFTEEN_PLUS: "statsLeadFifteenPlus",
};

function ArrivalCurve({
  curve,
  single,
  labelledBy,
}: {
  curve: Arrivals["curve"];
  single: boolean;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    arrivals: { label: t("statsArrivalsSeries"), color: "var(--chart-1)" },
  };
  const data = curve.map((b) => ({
    label: formatCurveLabel(b, single),
    arrivals: b.arrivals,
  }));

  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="arrivals" fill="var(--color-arrivals)" />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[t("statsArrivalTimeHeader"), t("statsArrivalsSeries")]}
        rows={data.map(({ label, arrivals }) => ({
          key: label,
          cells: [label, formatCount(arrivals, lang)],
        }))}
      />
    </>
  );
}

function LeadTimeChart({ rows }: { rows: LeadRow[] }) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    signed_up: { label: t("statsSeriesSignedUp"), color: "var(--chart-2)" },
  };
  const data = rows.map((r) => ({
    label: t(LEAD_LABELS[r.bucket]),
    signed_up: r.signed_up,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={80}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="signed_up" fill="var(--color-signed_up)" />
      </BarChart>
    </ChartContainer>
  );
}

/** Sign-ups and the no-show rate of each lead-time bucket; a rate from few people is dimmed with its n. */
function LeadTimeTable({
  rows,
  labelledBy,
}: {
  rows: LeadRow[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const head = "py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <table
      aria-labelledby={labelledBy}
      className="mt-3 w-full text-sm tabular-nums"
    >
      <thead>
        <tr className="border-b">
          <th scope="col" className={cn(head, "text-left")}>
            {t("statsLeadTimeHeader")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsSeriesSignedUp")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsNoShowRate")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.bucket} data-slot="lead-row">
            <th
              scope="row"
              data-slot="bucket"
              className="py-1.5 text-left font-normal"
            >
              {t(LEAD_LABELS[r.bucket])}
            </th>
            <td data-slot="signed-up" className="py-1.5 text-right">
              {formatCount(r.signed_up, lang)}
            </td>
            <RateCell rate={r.no_show_rate} n={r.signed_up - r.cancelled} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ArrivalsContent({
  data,
  single,
}: {
  data: Arrivals;
  single: boolean;
}) {
  const { t, lang } = useLanguage();
  const { curve, summary, lead_time, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind);

  if (summary.arrivals === 0 && lead_time.every((r) => r.signed_up === 0)) {
    return <StatsEmptyState />;
  }

  /**
   * The line under a time. One event: its offset from the start (its card
   * shows a clock time) and the period average. Aggregate: the change vs. the
   * previous period.
   */
  function compareMinutes(
    current: number | null,
    baseline: number | null | undefined,
  ): string | undefined {
    if (comparison_kind === "PERIOD_AVERAGE") {
      const fromStart =
        current === null
          ? []
          : [t("statsFromStart").replace("{0}", formatOffset(current))];
      const average =
        baseline == null
          ? []
          : [t("statsPeriodAverage").replace("{0}", formatOffset(baseline))];
      const parts = [...fromStart, ...average];
      return parts.length > 0 ? parts.join(" · ") : undefined;
    }
    return line({
      unit: "minutes",
      change: minuteChange(current, baseline ?? null),
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

  const time = (local: string | null, minutes: number | null) =>
    (single ? local : null) ??
    (minutes === null ? NO_VALUE : formatOffset(minutes));
  const peak = summary.peak;
  // The peak is a 15-minute bucket: one event shows the window it covers.
  const peakLabel = (p: NonNullable<typeof peak>) =>
    single && p.local_time
      ? formatClockWindow(p.local_time)
      : formatOffset(p.start_minute);

  return (
    <div className="space-y-3">
      <div className={headlineGrid(HEADLINE_CARDS)}>
        <HeadlineStat
          label={t("statsPeakArrival")}
          value={peak ? peakLabel(peak) : NO_VALUE}
        />
        <HeadlineStat
          label={t("statsHalfArrived")}
          value={time(summary.median_local_time, summary.median_minutes)}
          comparison={compareMinutes(
            summary.median_minutes,
            comparison?.median_minutes,
          )}
        />
        <HeadlineStat
          label={t("statsNinetyArrived")}
          value={time(summary.p90_local_time, summary.p90_minutes)}
          comparison={compareMinutes(
            summary.p90_minutes,
            comparison?.p90_minutes,
          )}
        />
        <HeadlineStat
          label={t("statsFirstHour")}
          value={formatRate(summary.first_hour_share, lang)}
          comparison={compareShare()}
          n={summary.first_hour_share === null ? undefined : summary.arrivals}
        />
      </div>
      <ChartCard title={t("statsArrivalCurve")}>
        {(headingId) =>
          summary.arrivals === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("statsNoArrivals")}
            </p>
          ) : (
            <ArrivalCurve
              curve={curve}
              single={single}
              labelledBy={headingId}
            />
          )
        }
      </ChartCard>
      <StatsNote>{t("statsNoteArrivals")}</StatsNote>
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
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("statsNoSignups")}
            </p>
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

export function ArrivalsTab({ orgId, query, onShowAll }: StatsTabProps) {
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
      {(data) => <ArrivalsContent data={data} single={single} />}
    </StatsTabGate>
  );
}
