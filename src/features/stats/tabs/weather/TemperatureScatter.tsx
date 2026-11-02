import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatApiDate, formatDecimal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { TooltipBox } from "../../components/TooltipBox";
import { formatCount } from "../../lib/statsFormat";
import type { TemperaturePoint } from "./temperatureBands";

/** Each event as a point: its temperature against how many came. */
export function TemperatureScatter({ points }: { points: TemperaturePoint[] }) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    attended: { label: t("statsAttended"), color: "var(--chart-1)" },
  };

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <ScatterChart>
        <CartesianGrid />
        <XAxis
          type="number"
          dataKey="temperature"
          name={t("statsTemperatureAxis")}
          domain={["auto", "auto"]}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="number"
          dataKey="attended"
          name={t("statsAttended")}
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as TemperaturePoint | undefined;
            if (!active || !point) return null;
            return (
              <TooltipBox>
                <p className="font-medium">{point.name}</p>
                <p className="text-muted-foreground">
                  {formatApiDate(point.date)}
                </p>
                <p className="tabular-nums">
                  {t("statsTemperatureAxis")}:{" "}
                  {formatDecimal(point.temperature, lang)}
                </p>
                <p className="tabular-nums">
                  {t("statsAttended")}: {formatCount(point.attended, lang)}
                </p>
              </TooltipBox>
            );
          }}
        />
        <Scatter data={points} fill="var(--color-attended)" />
      </ScatterChart>
    </ChartContainer>
  );
}
