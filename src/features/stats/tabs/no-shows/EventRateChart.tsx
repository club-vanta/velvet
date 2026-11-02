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
import { eventNameLabel } from "../../lib/chartLabels";
import { BAR_END_UP } from "../../lib/chartMarks";
import {
  formatCount,
  formatRate,
  shareTicks,
  withEventDays,
} from "../../lib/statsFormat";

type NoShows = components["schemas"]["NoShowStatsPublic"];

/** The no-show rate of each event of the period, oldest first. */
export function EventRateChart({
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
  const data = withEventDays(meetups).map((m) => ({
    name: m.name,
    day: m.day,
    // No bar, rather than a 0%, for an event where nobody was expected.
    rate: m.no_show_rate,
    m,
  }));
  const percent = (value: number) => formatRate(value, lang);
  const ticks = shareTicks(Math.max(0, ...data.map((d) => d.rate ?? 0)));

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
                labelFormatter={eventNameLabel}
                formatter={percentFormatter(config, percent)}
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
