import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { components } from "@/api/types";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { useLanguage } from "@/lib/i18n";
import { TooltipBox } from "../../components/TooltipBox";
import { BAR_END_UP } from "../../lib/chartMarks";
import { formatCount } from "../../lib/statsFormat";
import { BAND_LABEL, roundAverage } from "./temperatureBands";

type Band = components["schemas"]["TemperatureBandRowPublic"];

/** The average attendance of each temperature band, with its events on hover. */
export function BandsChart({ rows }: { rows: Band[] }) {
  const { t, lang } = useLanguage();
  const config: ChartConfig = {
    avg_attended: { label: t("statsAvgAttended"), color: "var(--chart-1)" },
  };
  const data = rows.map((r) => ({
    label: t(BAND_LABEL[r.band]),
    // An empty band leaves its slot empty instead of drawing a zero.
    avg_attended: roundAverage(r.avg_attended),
    events: r.events,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis
          width={32}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            const item = payload?.[0]?.payload as
              (typeof data)[number] | undefined;
            if (!active || !item) return null;
            return (
              <TooltipBox>
                <p className="font-medium">{item.label}</p>
                <p className="tabular-nums">
                  {t("statsAvgAttended")}:{" "}
                  {formatCount(item.avg_attended, lang)}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  {t("statsEvents")}: {formatCount(item.events, lang)}
                </p>
              </TooltipBox>
            );
          }}
        />
        <Bar
          dataKey="avg_attended"
          fill="var(--color-avg_attended)"
          radius={BAR_END_UP}
        />
      </BarChart>
    </ChartContainer>
  );
}
