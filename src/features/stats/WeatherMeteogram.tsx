import {
  Area,
  Bar,
  BarChart,
  ComposedChart,
  LabelList,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import type { components } from "@/api/types";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDecimal, formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "./ChartTextTable";
import { formatCount } from "./statsFormat";
import {
  arrivalsInDomain,
  bucketCenter,
  hourCenter,
  hourRows,
  meteogramDomain,
  type Domain,
} from "./meteogramData";
import { WEATHER_ICON_SRC, weatherIcon } from "./weatherIcon";

type Hour = components["schemas"]["WeatherHourPublic"];
type Bucket = components["schemas"]["ArrivalBucketPublic"];

/** The y axis width every strip shares, so their plot areas and the icon row line up. */
const Y_AXIS_WIDTH = 32;
const MARGIN = { top: 4, right: 0, bottom: 0, left: 0 };

const config: ChartConfig = {
  temperature: { color: "var(--chart-3)" },
  rain: { color: "var(--chart-2)" },
  arrivals: { color: "var(--chart-1)" },
};

/** The x axis of a strip: the shared domain, a tick per hour, labels only on the last strip. */
function TimeAxis({
  domain,
  hours,
  labelled,
}: {
  domain: Domain;
  hours: Hour[];
  labelled: boolean;
}) {
  const label = new Map(
    hours.map((h) => [h.offset_minutes, formatTime(h.time)]),
  );
  return (
    <XAxis
      type="number"
      dataKey="x"
      domain={domain}
      allowDataOverflow
      ticks={hours.map((h) => h.offset_minutes)}
      tickFormatter={(offset: number) => label.get(offset) ?? ""}
      tickLine={false}
      axisLine={labelled}
      hide={!labelled}
      interval="preserveStartEnd"
    />
  );
}

/** The before part shaded and the start marked, on every strip. */
function StartMarks({ domain, label }: { domain: Domain; label?: string }) {
  return (
    <>
      <ReferenceArea
        x1={domain[0]}
        x2={0}
        fill="var(--muted-foreground)"
        fillOpacity={0.08}
        ifOverflow="hidden"
      />
      <ReferenceLine
        x={0}
        stroke="var(--muted-foreground)"
        strokeDasharray="3 3"
        label={
          label
            ? {
                value: label,
                position: "insideTopLeft",
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }
            : undefined
        }
      />
    </>
  );
}

/** One icon per hour over the plot area, still for viewers who ask for less motion. */
function IconRow({ hours }: { hours: Hour[] }) {
  const { t } = useLanguage();
  return (
    <div className="flex" style={{ paddingLeft: Y_AXIS_WIDTH }}>
      {hours.map((h) => {
        const icon = weatherIcon(h.weather_code, h.is_day);
        const src = icon && WEATHER_ICON_SRC[icon.name];
        return (
          <div key={h.time} className="flex flex-1 justify-center">
            {icon && src ? (
              <picture>
                <source
                  media="(prefers-reduced-motion: reduce)"
                  srcSet={src.still}
                />
                {/* The line icons are drawn light gray; darken them on the light theme. */}
                <img
                  src={src.animated}
                  alt={t(icon.label)}
                  className="size-7 brightness-50 sm:size-9 dark:brightness-100"
                />
              </picture>
            ) : (
              <span className="size-7 sm:size-9" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The weather of one event hour by hour, stacked over its arrivals on one time
 * axis: icons, temperature against how it felt, rain, and arrivals every 15
 * minutes. `arrivals` is undefined while loading and null when it failed.
 */
export function WeatherMeteogram({
  hours,
  arrivals,
  labelledBy,
}: {
  hours: Hour[];
  arrivals: Bucket[] | null | undefined;
  labelledBy: string;
}) {
  const { t, lang } = useLanguage();
  const domain = meteogramDomain(hours);
  const temperature = hours.map((h) => ({
    x: hourCenter(h),
    temperature: h.temperature,
    apparent: h.apparent_temperature,
    // The shaded gap between the two lines, only where both are known.
    gap:
      h.temperature === null || h.apparent_temperature === null
        ? null
        : [h.apparent_temperature, h.temperature],
  }));
  const rain = hours.map((h) => ({
    x: hourCenter(h),
    rain: h.precipitation_mm,
  }));
  const measure = (value: number | null, unit: string) =>
    value === null ? "–" : `${formatDecimal(value, lang)} ${unit}`;
  const rows = hourRows(hours, arrivals ?? null);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 bg-chart-3" />
          {t("weatherTemp")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 border-t-2 border-dashed border-chart-3" />
          {t("weatherFeelsLike")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-2" />
          {t("weatherRain")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-1" />
          {t("statsWeatherArrivals")}
        </span>
      </div>
      <IconRow hours={hours} />
      <ChartContainer config={config} className="aspect-auto h-28 w-full">
        <ComposedChart data={temperature} margin={MARGIN}>
          <TimeAxis domain={domain} hours={hours} labelled={false} />
          <YAxis
            width={Y_AXIS_WIDTH}
            tickLine={false}
            axisLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
            allowDecimals={false}
            unit="°"
          />
          <StartMarks domain={domain} label={t("statsWeatherStart")} />
          <Area
            dataKey="gap"
            fill="var(--color-temperature)"
            fillOpacity={0.15}
            stroke="none"
            isAnimationActive={false}
          />
          <Line
            dataKey="temperature"
            stroke="var(--color-temperature)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="apparent"
            stroke="var(--color-temperature)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
      <ChartContainer config={config} className="aspect-auto h-16 w-full">
        <BarChart data={rain} margin={{ ...MARGIN, top: 14 }}>
          <TimeAxis domain={domain} hours={hours} labelled={false} />
          <YAxis width={Y_AXIS_WIDTH} hide />
          <StartMarks domain={domain} />
          <Bar
            dataKey="rain"
            fill="var(--color-rain)"
            radius={2}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="rain"
              position="top"
              fontSize={10}
              fill="var(--color-rain)"
              formatter={(value: unknown) =>
                typeof value === "number" && value > 0
                  ? `${formatDecimal(value, lang)} mm`
                  : ""
              }
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {arrivals === undefined ? (
        <Skeleton
          data-testid="meteogram-arrivals-skeleton"
          className="h-24 w-full"
        />
      ) : arrivals === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("statsWeatherArrivalsFailed")}
        </p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-24 w-full">
          <BarChart
            data={arrivalsInDomain(arrivals, domain).map((b) => ({
              x: bucketCenter(b),
              arrivals: b.arrivals,
            }))}
            margin={MARGIN}
          >
            <TimeAxis domain={domain} hours={hours} labelled />
            <YAxis
              width={Y_AXIS_WIDTH}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <StartMarks domain={domain} />
            <Bar
              dataKey="arrivals"
              fill="var(--color-arrivals)"
              radius={1}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      )}
      <ChartTextTable
        labelledBy={labelledBy}
        headers={[
          t("statsWeatherHourHeader"),
          t("statsWeatherConditionHeader"),
          t("weatherTemp"),
          t("weatherFeelsLike"),
          t("weatherRain"),
          t("statsWeatherArrivals"),
        ]}
        rows={rows.map((r) => {
          const icon = weatherIcon(r.weather_code, r.is_day);
          return {
            key: r.time,
            cells: [
              formatTime(r.time),
              icon ? t(icon.label) : "–",
              measure(r.temperature, "°C"),
              measure(r.apparent_temperature, "°C"),
              measure(r.precipitation_mm, "mm"),
              formatCount(r.arrivals, lang),
            ],
          };
        })}
      />
    </div>
  );
}
