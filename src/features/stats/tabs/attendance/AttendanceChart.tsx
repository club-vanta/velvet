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
import { BAR_GAP } from "../../lib/chartMarks";
import { formatCount, withEventDays } from "../../lib/statsFormat";
import { legendOrder, SERIES } from "./attendanceSeries";

type Attendance = components["schemas"]["AttendanceStatsPublic"];

/**
 * Who came, who did not and who cancelled, stacked per event: columns over
 * time for a period, one horizontal bar for one event.
 */
export function AttendanceChart({
  meetups,
  single,
  labelledBy,
}: {
  meetups: Attendance["meetups"];
  single: boolean;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();

  const config: ChartConfig = Object.fromEntries(
    SERIES.map(({ key, label, color }) => [key, { label: t(label), color }]),
  );
  const data = withEventDays(meetups);

  const bars = SERIES.map(({ key }) => (
    <Bar
      key={key}
      dataKey={key}
      stackId="attendance"
      fill={`var(--color-${key})`}
      {...BAR_GAP}
    />
  ));
  const tooltip = (
    <ChartTooltip
      content={<ChartTooltipContent labelFormatter={eventNameLabel} />}
    />
  );
  const legend = (
    <ChartLegend itemSorter={legendOrder} content={<ChartLegendContent />} />
  );

  return (
    <>
      <ChartContainer
        config={config}
        className={
          single ? "aspect-auto h-32 w-full" : "aspect-auto h-64 w-full"
        }
      >
        {single ? (
          <BarChart data={data} layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="day" hide />
            {tooltip}
            {legend}
            {bars}
          </BarChart>
        ) : (
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
            {tooltip}
            {legend}
            {bars}
          </BarChart>
        )}
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsEventHeader"),
          t("statsDateHeader"),
          ...SERIES.map(({ label }) => t(label)),
        ]}
        rows={data.map((m) => ({
          key: m.meetup_id,
          cells: [
            m.name,
            formatApiDate(m.date),
            ...SERIES.map(({ key }) => formatCount(m[key], lang)),
          ],
        }))}
      />
    </>
  );
}
