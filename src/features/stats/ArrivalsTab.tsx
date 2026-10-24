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
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "./StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatMinuteChange,
  formatOffset,
  formatPointChange,
  formatRate,
  isSmallSample,
  NO_VALUE,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";

type Arrivals = components["schemas"]["ArrivalStatsPublic"];
type Summary = components["schemas"]["ArrivalSummaryPublic"];
type LeadRow = components["schemas"]["LeadTimeRowPublic"];

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
}: {
  curve: Arrivals["curve"];
  single: boolean;
}) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    arrivals: { label: t("statsArrivalCurve"), color: "var(--chart-1)" },
  };
  const data = curve.map((b) => ({
    label: (single ? b.local_time : null) ?? formatOffset(b.start_minute),
    arrivals: b.arrivals,
  }));

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-64 min-h-48 w-full"
    >
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
  );
}

function LeadTimeChart({ rows }: { rows: LeadRow[] }) {
  const { t } = useLanguage();
  const config: ChartConfig = {
    signed_up: { label: t("statsRsvps"), color: "var(--chart-2)" },
  };
  const data = rows.map((r) => ({
    label: t(LEAD_LABELS[r.bucket]),
    signed_up: r.signed_up,
  }));

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-56 min-h-48 w-full"
    >
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
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

/** The no-show rate of each lead-time bucket, dimmed when few people back it. */
function LeadTimeRates({ rows }: { rows: LeadRow[] }) {
  const { t, lang } = useLanguage();

  return (
    <ul className="mt-3 divide-y text-sm">
      {rows.map((r) => {
        const n = r.signed_up - r.cancelled;
        const small = isSmallSample(n);
        return (
          <li
            key={r.bucket}
            data-slot="lead-row"
            className={cn(
              "flex flex-wrap items-baseline justify-between gap-x-3 py-1.5 tabular-nums",
              small && "text-muted-foreground",
            )}
          >
            <span data-slot="bucket">{t(LEAD_LABELS[r.bucket])}</span>
            <span data-slot="signed-up">{r.signed_up}</span>
            <span>
              <span data-slot="rate">
                {t("statsNoShowRate")} {formatRate(r.no_show_rate, lang)}
              </span>
              {small && (
                <span data-slot="sample" className="ml-2 text-xs">
                  {t("statsSample").replace("{0}", String(n))}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
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

  if (summary.arrivals === 0 && lead_time.every((r) => r.signed_up === 0)) {
    return <StatsEmptyState />;
  }

  const base: Summary | null = comparison;
  const offset = (minutes: number | null | undefined) =>
    minutes === null || minutes === undefined
      ? undefined
      : formatOffset(minutes);

  /** The line under a time: change vs. the previous period, or the period average. */
  function compareMinutes(
    current: number | null,
    baseline: number | null | undefined,
  ): string | undefined {
    if (comparison_kind === "PERIOD_AVERAGE") {
      const average = offset(baseline);
      return average === undefined
        ? undefined
        : t("statsPeriodAverage").replace("{0}", average);
    }
    if (comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const change = formatMinuteChange(current, baseline ?? null);
    if (change === null) return undefined;
    return t("statsMinutesVsPrevious").replace(
      "{0}",
      `${change > 0 ? "+" : ""}${change}`,
    );
  }

  function compareShare(): string | undefined {
    if (!base) return undefined;
    if (comparison_kind === "PERIOD_AVERAGE") {
      return t("statsPeriodAverage").replace(
        "{0}",
        formatRate(base.first_hour_share, lang),
      );
    }
    if (comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const change = formatPointChange(
      summary.first_hour_share,
      base.first_hour_share,
    );
    if (change === null) return undefined;
    return t("statsVsPreviousPts").replace(
      "{0}",
      `${change > 0 ? "+" : ""}${change}`,
    );
  }

  const time = (local: string | null, minutes: number | null) =>
    (single ? local : null) ??
    (minutes === null ? NO_VALUE : formatOffset(minutes));
  const peak = summary.peak;

  return (
    <div className="space-y-3">
      <div className={headlineGrid(single)}>
        <HeadlineStat
          label={t("statsPeakArrival")}
          value={peak ? time(peak.local_time, peak.start_minute) : NO_VALUE}
        />
        <HeadlineStat
          label={t("statsHalfArrived")}
          value={time(summary.median_local_time, summary.median_minutes)}
          comparison={compareMinutes(
            summary.median_minutes,
            base?.median_minutes,
          )}
        />
        <HeadlineStat
          label={t("statsNinetyArrived")}
          value={time(summary.p90_local_time, summary.p90_minutes)}
          comparison={compareMinutes(summary.p90_minutes, base?.p90_minutes)}
        />
        <HeadlineStat
          label={t("statsFirstHour")}
          value={formatRate(summary.first_hour_share, lang)}
          comparison={compareShare()}
          n={summary.arrivals}
        />
      </div>
      <ChartCard title={t("statsArrivalCurve")}>
        {summary.arrivals === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("statsNoArrivals")}
          </p>
        ) : (
          <ArrivalCurve curve={curve} single={single} />
        )}
      </ChartCard>
      <StatsNote>{t("statsNoteArrivals")}</StatsNote>
      <ChartCard title={t("statsLeadTime")}>
        <LeadTimeChart rows={lead_time} />
        <LeadTimeRates rows={lead_time} />
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
      cards={4}
      testId="arrivals-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <ArrivalsContent data={data} single={single} />}
    </StatsTabGate>
  );
}
