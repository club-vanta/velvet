import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "../../components/ChartTextTable";
import { percentFormatter } from "../../components/percentTooltip";
import { BAR_END_RIGHT, BAR_END_UP } from "../../lib/chartMarks";
import { formatRate, shareTicks } from "../../lib/statsFormat";

type Group =
  | components["schemas"]["GenderGroupPublic"]
  | components["schemas"]["AgeGroupPublic"];

/** Bar height per row of a horizontal chart, plus room for the axis. */
const ROW_HEIGHT = 40;
const CHART_CHROME = 40;

/** Each group's share of the attendances. */
export function ShareChart<G extends Group>({
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
