import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useDemographicsStats } from "@/hooks/useDemographicsStats";
import { useLanguage } from "@/lib/i18n";
import { ChartCard } from "./ChartCard";
import { percentFormatter } from "./percentTooltip";
import { useGroupLabels } from "./groupLabels";
import { BAR_END_RIGHT, BAR_END_UP } from "./chartMarks";
import { ChartTextTable } from "./ChartTextTable";
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "@/components/StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatAge,
  percentChange,
  formatCount,
  pointChange,
  formatRate,
  yearsChange,
  shareTicks,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";
import { useComparisonLine } from "./useComparisonLine";

type Demographics = components["schemas"]["DemographicStatsPublic"];
type GenderGroup = components["schemas"]["GenderGroupPublic"];
type AgeGroup = components["schemas"]["AgeGroupPublic"];
type Group = GenderGroup | AgeGroup;

/** Headline cards of the loaded tab; the skeleton shows the same count. */
const HEADLINE_CARDS = 3;

/** Bar height per row of a horizontal chart, plus room for the axis. */
const ROW_HEIGHT = 40;
const CHART_CHROME = 40;

/** Each group's share of the attendances. */
function ShareChart<G extends Group>({
  groups,
  label,
  bars,
  labelledBy,
}: {
  groups: G[];
  label: (key: G["key"]) => string;
  /** The direction the bars grow: sideways for long labels, upward otherwise. */
  bars: "horizontal" | "vertical";
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const horizontal = bars === "horizontal";
  const config: ChartConfig = {
    attended: { label: t("statsSeriesAttended"), color: "var(--chart-1)" },
  };
  const data = groups.map((g) => ({
    label: label(g.key),
    attended: g.attended_share ?? 0,
  }));
  const percent = (value: number) => formatRate(value, lang);
  const ticks = shareTicks(Math.max(0, ...data.map((d) => d.attended)));
  const domain: [number, number] = [0, ticks[ticks.length - 1]];

  return (
    <>
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{
          height: horizontal ? data.length * ROW_HEIGHT + CHART_CHROME : 256,
        }}
      >
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"}>
          <CartesianGrid vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                domain={domain}
                ticks={ticks}
                tickFormatter={percent}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                width={40}
                domain={domain}
                ticks={ticks}
                tickFormatter={percent}
                tickLine={false}
                axisLine={false}
              />
            </>
          )}
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={percentFormatter(config, percent)}
              />
            }
          />
          <Bar
            dataKey="attended"
            fill="var(--color-attended)"
            radius={horizontal ? BAR_END_RIGHT : BAR_END_UP}
          />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[t("statsGroupHeader"), t("statsSeriesAttended")]}
        rows={groups.map((g) => ({
          key: String(g.key),
          cells: [label(g.key), formatRate(g.attended_share, lang)],
        }))}
      />
    </>
  );
}

function DemographicsContent({ data }: { data: Demographics }) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const { gender, age, summary, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind);

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
          label={t("statsMedianAge")}
          value={formatAge(summary.median_age, lang)}
          comparison={compareAge()}
        />
        <HeadlineStat
          label={t("statsKnownAge")}
          value={formatRate(summary.known_age_share, lang)}
          comparison={compareKnown()}
          n={summary.known_age_share === null ? undefined : summary.attended}
        />
        <HeadlineStat
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

export function DemographicsTab({ orgId, query, onShowAll }: StatsTabProps) {
  const statsQ = useDemographicsStats(orgId, query);
  const single = !!query?.meetupId;

  return (
    <StatsTabGate
      statsQ={statsQ}
      single={single}
      cards={HEADLINE_CARDS}
      testId="demographics-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <DemographicsContent data={data} />}
    </StatsTabGate>
  );
}
