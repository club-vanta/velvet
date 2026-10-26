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
import { useDemographicsStats } from "@/hooks/useDemographicsStats";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { MAZMO_GENDER_LABEL, mazmoLabel } from "@/lib/mazmoProfile";
import { cn } from "@/lib/utils";
import { ChartCard } from "./ChartCard";
import { ChartTextTable } from "./ChartTextTable";
import { HeadlineStat } from "./HeadlineStat";
import { RateCell } from "./RateCell";
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

const AGE_LABELS: Record<AgeGroup["key"], TranslationKey> = {
  AGE_18_24: "statsAge18to24",
  AGE_25_29: "statsAge25to29",
  AGE_30_34: "statsAge30to34",
  AGE_35_39: "statsAge35to39",
  AGE_40_49: "statsAge40to49",
  AGE_50_PLUS: "statsAge50Plus",
  UNKNOWN: "statsUnknown",
};

/** Bar height per row of a horizontal chart, plus room for the axis and legend. */
const ROW_HEIGHT = 56;
const CHART_CHROME = 72;

function useGroupLabels() {
  const { t } = useLanguage();
  return {
    gender: (key: string | null) =>
      key === null ? t("statsUnknown") : mazmoLabel(MAZMO_GENDER_LABEL, key, t),
    age: (key: AgeGroup["key"]) => t(AGE_LABELS[key]),
  };
}

/** Each group's share of the people who came next to its share of those expected. */
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
    expected: { label: t("statsSeriesExpected"), color: "var(--chart-2)" },
  };
  const data = groups.map((g) => ({
    label: label(g.key),
    attended: g.attended_share ?? 0,
    expected: g.expected_share ?? 0,
  }));
  const percent = (value: number) => formatRate(value, lang);
  const ticks = shareTicks(
    Math.max(0, ...data.flatMap((d) => [d.attended, d.expected])),
  );
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
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="attended" fill="var(--color-attended)" />
          <Bar dataKey="expected" fill="var(--color-expected)" />
        </BarChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsGroupHeader"),
          t("statsSeriesAttended"),
          t("statsSeriesExpected"),
        ]}
        rows={groups.map((g) => ({
          key: String(g.key),
          cells: [
            label(g.key),
            formatRate(g.attended_share, lang),
            formatRate(g.expected_share, lang),
          ],
        }))}
      />
    </>
  );
}

/** One titled block of table rows: a header row, then a row per group. */
function NoShowGroupRows<G extends Group>({
  title,
  groups,
  label,
}: {
  title: string;
  groups: G[];
  label: (key: G["key"]) => string;
}) {
  const { lang } = useLanguage();

  return (
    <tbody className="divide-y">
      <tr>
        <th
          colSpan={3}
          scope="rowgroup"
          className="pt-3 pb-1 text-left text-xs font-medium text-muted-foreground"
        >
          {title}
        </th>
      </tr>
      {groups.map((group) => (
        <tr key={group.key ?? ""} data-slot="group-row">
          <th
            scope="row"
            data-slot="group"
            className="py-1.5 text-left font-normal"
          >
            {label(group.key)}
          </th>
          <td data-slot="expected" className="py-1.5 text-right">
            {formatCount(group.expected, lang)}
          </td>
          <RateCell rate={group.no_show_rate} n={group.expected} />
        </tr>
      ))}
    </tbody>
  );
}

/** The no-show rate of each gender and age group; a rate from few people is dimmed with its n. */
function NoShowTable({
  gender,
  age,
  labels,
  labelledBy,
}: {
  gender: GenderGroup[];
  age: AgeGroup[];
  labels: ReturnType<typeof useGroupLabels>;
  labelledBy: string;
}) {
  const { t } = useLanguage();
  const head = "py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <table aria-labelledby={labelledBy} className="w-full text-sm tabular-nums">
      <thead>
        <tr className="border-b">
          <th scope="col" className={cn(head, "text-left")}>
            {t("statsGroupHeader")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsSeriesExpected")}
          </th>
          <th scope="col" className={cn(head, "text-right")}>
            {t("statsNoShowRate")}
          </th>
        </tr>
      </thead>
      <NoShowGroupRows
        title={t("statsGender")}
        groups={gender}
        label={labels.gender}
      />
      <NoShowGroupRows title={t("statsAge")} groups={age} label={labels.age} />
    </table>
  );
}

function DemographicsContent({ data }: { data: Demographics }) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const { gender, age, summary, comparison, comparison_kind } = data;
  const line = useComparisonLine(comparison_kind);

  if (summary.attended === 0 && age.every((g) => g.expected === 0)) {
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
      <ChartCard title={t("statsNoShowByGroup")}>
        {(headingId) => (
          <NoShowTable
            gender={gender}
            age={age}
            labels={labels}
            labelledBy={headingId}
          />
        )}
      </ChartCard>
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
