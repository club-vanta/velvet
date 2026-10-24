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
import { HeadlineStat } from "./HeadlineStat";
import { StatsNote } from "./StatsNote";
import { headlineGrid } from "./headlineGrid";
import { StatsEmptyState, StatsTabGate } from "./StatsTabState";
import {
  formatAge,
  formatChange,
  formatCount,
  formatPointChange,
  formatRate,
  formatYearsChange,
  isSmallSample,
} from "./statsFormat";
import type { StatsTabProps } from "./statsTab";

type Demographics = components["schemas"]["DemographicStatsPublic"];
type Group = components["schemas"]["DemographicGroupPublic"];

const AGE_LABELS: Record<string, TranslationKey> = {
  AGE_18_24: "statsAge18to24",
  AGE_25_29: "statsAge25to29",
  AGE_30_34: "statsAge30to34",
  AGE_35_39: "statsAge35to39",
  AGE_40_49: "statsAge40to49",
  AGE_50_PLUS: "statsAge50Plus",
};

/** Bar height per row of a horizontal chart, plus room for the axis and legend. */
const ROW_HEIGHT = 56;
const CHART_CHROME = 72;

function useGroupLabels() {
  const { t } = useLanguage();
  return {
    gender: (key: string | null) =>
      key === null ? t("statsUnknown") : mazmoLabel(MAZMO_GENDER_LABEL, key, t),
    age: (key: string | null) =>
      key !== null && Object.hasOwn(AGE_LABELS, key)
        ? t(AGE_LABELS[key])
        : t("statsUnknown"),
  };
}

/** Each group's share of the people who came next to its share of those expected. */
function ShareChart({
  groups,
  label,
  layout,
}: {
  groups: Group[];
  label: (key: string | null) => string;
  layout: "horizontal" | "vertical";
}) {
  const { t, lang } = useLanguage();
  const horizontal = layout === "vertical";
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

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{
        height: horizontal ? data.length * ROW_HEIGHT + CHART_CHROME : 256,
      }}
    >
      <BarChart data={data} layout={layout}>
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis
              type="number"
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
  );
}

/** The no-show rate of each gender and age group; a rate from few people is dimmed with its n. */
function NoShowTable({
  gender,
  age,
  labels,
  labelledBy,
}: {
  gender: Group[];
  age: Group[];
  labels: ReturnType<typeof useGroupLabels>;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const head = "py-1.5 text-xs font-medium text-muted-foreground";
  const rows = [
    ...gender.map((g) => ({
      id: `gender-${g.key ?? ""}`,
      label: labels.gender(g.key),
      group: g,
    })),
    ...age.map((g) => ({
      id: `age-${g.key ?? ""}`,
      label: labels.age(g.key),
      group: g,
    })),
  ];

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
      <tbody className="divide-y">
        {rows.map(({ id, label, group }) => {
          const small =
            group.no_show_rate !== null && isSmallSample(group.expected);
          return (
            <tr key={id} data-slot="group-row">
              <th
                scope="row"
                data-slot="group"
                className="py-1.5 text-left font-normal"
              >
                {label}
              </th>
              <td data-slot="expected" className="py-1.5 text-right">
                {group.expected}
              </td>
              <td
                data-slot="rate"
                className={cn(
                  "py-1.5 text-right",
                  small && "text-muted-foreground",
                )}
              >
                <span data-slot="rate-value">
                  {formatRate(group.no_show_rate, lang)}
                </span>
                {small && (
                  <span data-slot="sample" className="ml-2 text-xs">
                    {t("statsSample").replace("{0}", String(group.expected))}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DemographicsContent({ data }: { data: Demographics }) {
  const { t, lang } = useLanguage();
  const labels = useGroupLabels();
  const { gender, age, summary, comparison, comparison_kind } = data;

  if (summary.attended === 0 && age.every((g) => g.expected === 0)) {
    return <StatsEmptyState />;
  }

  /** One event: the period average; aggregate: the change vs. the previous period. */
  function compareAge(): string | undefined {
    if (!comparison) return undefined;
    if (comparison_kind === "PERIOD_AVERAGE") {
      return comparison.median_age === null
        ? undefined
        : t("statsPeriodAverage").replace(
            "{0}",
            formatAge(comparison.median_age, lang),
          );
    }
    const change = formatYearsChange(
      summary.median_age,
      comparison.median_age,
      lang,
    );
    return change === null
      ? undefined
      : t("statsYearsVsPrevious").replace("{0}", change);
  }

  function compareKnown(): string | undefined {
    if (!comparison) return undefined;
    const change = formatPointChange(
      summary.known_age_share,
      comparison.known_age_share,
    );
    if (change === null) return undefined;
    return t(
      comparison_kind === "PERIOD_AVERAGE"
        ? "statsPtsVsPeriod"
        : "statsVsPreviousPts",
    ).replace("{0}", `${change > 0 ? "+" : ""}${change}`);
  }

  // The comparison's count is a period total for one event, so it only
  // compares against the previous period.
  function compareAttended(): string | undefined {
    if (!comparison || comparison_kind !== "PREVIOUS_PERIOD") return undefined;
    const change = formatChange(summary.attended, comparison.attended);
    return change === null
      ? undefined
      : t("statsVsPrevious").replace(
          "{0}",
          `${change > 0 ? "+" : ""}${change}%`,
        );
  }

  return (
    <div className="space-y-3">
      <div className={headlineGrid(3)}>
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
        <ShareChart groups={gender} label={labels.gender} layout="vertical" />
      </ChartCard>
      <StatsNote>{t("statsNoteGender")}</StatsNote>
      <ChartCard title={t("statsAge")}>
        <ShareChart groups={age} label={labels.age} layout="horizontal" />
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
      cards={3}
      testId="demographics-skeleton"
      onShowAll={onShowAll}
    >
      {(data) => <DemographicsContent data={data} />}
    </StatsTabGate>
  );
}
