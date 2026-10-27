import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatApiDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "./ChartTextTable";
import type { ReturnPoint } from "./nightCrowd";
import { percentFormatter } from "./percentTooltip";
import {
  formatEventDay,
  formatRate,
  NO_VALUE,
  shareTicks,
} from "./statsFormat";

const SERIES = ["first", "already"] as const;

/**
 * How much of the night's crowd had come back by each later event, for the
 * first-timers and for those who already came, from zero on the night.
 */
export function ReturnCurve({
  points,
  labelledBy,
}: {
  points: ReturnPoint[];
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const gradientId = useId();
  const config: ChartConfig = {
    first: { label: t("statsBandFirst"), color: "var(--chart-1)" },
    already: { label: t("statsAlreadyCame"), color: "var(--chart-2)" },
  };
  const percent = (value: number) => formatRate(value, lang);
  const data = points.map((p) => ({
    ...p,
    day: p.date ? formatEventDay(p.date) : t("statsThatNight"),
    label: p.name ?? t("statsThatNight"),
  }));
  const ticks = shareTicks(
    Math.max(0, ...points.flatMap((p) => [p.first ?? 0, p.already ?? 0])),
  );
  const shown = SERIES.filter((s) => points.some((p) => p[s] !== null));

  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-60 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
          <defs>
            {shown.map((s) => (
              <linearGradient
                key={s}
                id={`${gradientId}-${s}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={`var(--color-${s})`}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={`var(--color-${s})`}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
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
                labelFormatter={(_, payload) => payload[0]?.payload?.label}
                formatter={percentFormatter(config, percent)}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {shown.map((s) => (
            <Area
              key={s}
              dataKey={s}
              type="monotone"
              stroke={`var(--color-${s})`}
              strokeWidth={2.5}
              fill={`url(#${gradientId}-${s})`}
              dot={{ r: 3, fill: `var(--color-${s})`, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              animationDuration={900}
            />
          ))}
        </AreaChart>
      </ChartContainer>
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsEventHeader"),
          t("statsDateHeader"),
          ...shown.map((s) => String(config[s].label)),
        ]}
        rows={data.map((d) => ({
          key: d.key,
          cells: [
            d.label,
            d.date ? formatApiDate(d.date) : NO_VALUE,
            ...shown.map((s) => formatRate(d[s], lang)),
          ],
        }))}
      />
    </>
  );
}
