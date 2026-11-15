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
import { formatApiDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "../../components/ChartTextTable";
import { eventNameLabel } from "../../lib/chartLabels";
import { BAR_END_UP, BAR_GAP } from "../../lib/chartMarks";
import { formatCount, withEventDays } from "../../lib/statsFormat";

type Retention = components["schemas"]["RetentionStatsPublic"];

/** New and returning people of each event, stacked. An event nobody came to keeps its empty slot. */
export function NewReturningChart({
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
  const data = withEventDays(meetups);

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
            content={<ChartTooltipContent labelFormatter={eventNameLabel} />}
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
        rows={data.map((m) => ({
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
