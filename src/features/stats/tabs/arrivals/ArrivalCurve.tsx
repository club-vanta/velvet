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
import { BAR_END_UP, BAR_GAP } from "../../lib/chartMarks";
import { formatCount, formatOffset } from "../../lib/statsFormat";
import type { CurveView } from "./curveView";

type Arrivals = components["schemas"]["ArrivalStatsPublic"];

/** The arrival curve by the local clock or by the time from the start, with its numbers as text. */
export function ArrivalCurve({
  data: { curve, clock_curve },
  view,
  labelledBy,
}: {
  data: Arrivals;
  view: CurveView;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    arrivals: { label: t("statsArrivalsSeries"), color: "var(--chart-1)" },
  };
  const data =
    view === "clock"
      ? clock_curve.map((b) => ({ label: b.local_time, arrivals: b.arrivals }))
      : curve.map((b) => ({
          label: formatOffset(b.start_minute),
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
          <Bar
            dataKey="arrivals"
            fill="var(--color-arrivals)"
            radius={BAR_END_UP}
            {...BAR_GAP}
          />
        </BarChart>
      </ChartContainer>
      <p className="text-center text-xs text-muted-foreground">
        {t(
          view === "clock"
            ? "statsArrivalAxisClock"
            : "statsArrivalAxisFromStart",
        )}
      </p>
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
