import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDecimal, formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "./ChartTextTable";
import { formatCount } from "./statsFormat";
import {
  arrivalsInDomain,
  bucketCenter,
  clockAt,
  hourCenter,
  hourRows,
  meteogramDomain,
  QUARTER,
  startHourOffset,
  type Domain,
} from "./meteogramData";
import { MeteogramTooltip, type MeteogramTip } from "./MeteogramTooltip";
import { WEATHER_ICON_SRC, weatherIcon } from "./weatherIcon";

type Hour = components["schemas"]["WeatherHourPublic"];
type Bucket = components["schemas"]["ArrivalBucketPublic"];

/** The y axis width every strip shares, so their plot areas and the icon row line up. */
const Y_AXIS_WIDTH = 32;
const MARGIN = { top: 4, right: 0, bottom: 0, left: 0 };
/**
 * Pixels per hour at each zoom step. The chart keeps at least this width and
 * scrolls sideways when the card is narrower, so a phone shows every hour's
 * icon, rain label and time without squeezing them.
 */
const HOUR_WIDTHS = [48, 72, 112] as const;

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
      interval={0}
    />
  );
}

/**
 * The before window shaded and the start marked, on every strip. The shade
 * ends where the during window begins, the hour that contains the start.
 */
function StartMarks({
  domain,
  startHour,
  label,
}: {
  domain: Domain;
  startHour: number;
  label?: string;
}) {
  return (
    <>
      <ReferenceArea
        x1={domain[0]}
        x2={startHour}
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

/**
 * One icon per hour over the plot area, still for viewers who ask for less
 * motion. Decorative: the text table names each hour's weather.
 */
function IconRow({ hours }: { hours: Hour[] }) {
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
                <img src={src.animated} alt="" className="size-7 sm:size-9" />
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
  const [zoom, setZoom] = useState(0);
  const hourWidth = HOUR_WIDTHS[zoom];
  const domain = meteogramDomain(hours);
  const startHour = startHourOffset(hours);
  const measure = (value: number | null, unit: string) =>
    value === null ? "–" : `${formatDecimal(value, lang)} ${unit}`;
  const hourTip = (h: Hour, lines: [string, string][]): MeteogramTip => ({
    title: formatTime(h.time),
    lines,
  });
  const temperature = hours.map((h) => ({
    x: hourCenter(h),
    tip: hourTip(h, [
      [t("weatherTemp"), measure(h.temperature, "°C")],
      [t("weatherFeelsLike"), measure(h.apparent_temperature, "°C")],
    ]),
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
    tip: hourTip(h, [[t("weatherRain"), measure(h.precipitation_mm, "mm")]]),
  }));
  const rows = hourRows(hours, arrivals ?? null);
  const charted = arrivals ? arrivalsInDomain(arrivals, domain) : [];
  const arrivalsCharted = charted.some((b) => b.arrivals > 0);
  // A dry night says so in words instead of drawing an empty strip.
  const rained = hours.some((h) => (h.precipitation_mm ?? 0) > 0);
  // The last strip drawn carries the hour labels.
  const labelled = arrivalsCharted
    ? "arrivals"
    : rained
      ? "rain"
      : "temperature";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted-foreground/20" />
          {t("statsWeatherBefore")}
        </span>
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
          {t("weatherRain")} (mm)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-1" />
          {t("statsWeatherArrivals")}
        </span>
        <span className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("statsWeatherZoomOut")}
            // aria-disabled, not disabled, so focus stays on the button at the limit.
            aria-disabled={zoom === 0}
            onClick={() => setZoom(Math.max(zoom - 1, 0))}
          >
            <ZoomOut aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("statsWeatherZoomIn")}
            aria-disabled={zoom === HOUR_WIDTHS.length - 1}
            onClick={() => setZoom(Math.min(zoom + 1, HOUR_WIDTHS.length - 1))}
          >
            <ZoomIn aria-hidden />
          </Button>
        </span>
      </div>
      <div
        role="group"
        aria-labelledby={labelledBy}
        // A scroll container must be focusable so the keyboard can scroll it
        // when the chart is wider than the card (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div
          data-testid="meteogram-content"
          className="space-y-1"
          style={{ minWidth: Y_AXIS_WIDTH + hours.length * hourWidth }}
        >
          <IconRow hours={hours} />
          <ChartContainer config={config} className="aspect-auto h-28 w-full">
            <ComposedChart data={temperature} margin={MARGIN}>
              <TimeAxis
                domain={domain}
                hours={hours}
                labelled={labelled === "temperature"}
              />
              <YAxis
                width={Y_AXIS_WIDTH}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 1", "dataMax + 1"]}
                allowDecimals={false}
                unit="°"
              />
              <StartMarks
                domain={domain}
                startHour={startHour}
                label={t("statsWeatherStart")}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--muted-foreground)" }}
                content={(props) => <MeteogramTooltip {...props} />}
              />
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
          {rained && (
            <ChartContainer config={config} className="aspect-auto h-16 w-full">
              <BarChart data={rain} margin={{ ...MARGIN, top: 14 }}>
                <TimeAxis
                  domain={domain}
                  hours={hours}
                  labelled={labelled === "rain"}
                />
                <YAxis
                  width={Y_AXIS_WIDTH}
                  tickLine={false}
                  axisLine={false}
                  tickCount={2}
                />
                <StartMarks domain={domain} startHour={startHour} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted-foreground)", fillOpacity: 0.1 }}
                  content={(props) => <MeteogramTooltip {...props} />}
                />
                <Bar
                  dataKey="rain"
                  fill="var(--color-rain)"
                  radius={2}
                  // Explicit widths: on a numeric axis Recharts sizes bars from the gap
                  // between points, so a lone point would get no width at all.
                  barSize={hourWidth - 8}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="rain"
                    position="top"
                    fontSize={10}
                    fill="var(--color-rain)"
                    formatter={(value: unknown) =>
                      typeof value === "number" && value > 0
                        ? formatDecimal(value, lang)
                        : ""
                    }
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
          {arrivalsCharted && (
            <ChartContainer config={config} className="aspect-auto h-24 w-full">
              <BarChart
                data={charted.map((b) => ({
                  x: bucketCenter(b),
                  arrivals: b.arrivals,
                  tip: {
                    title: t("statsWeatherQuarter")
                      .replace(
                        "{0}",
                        formatTime(clockAt(hours, b.start_minute)),
                      )
                      .replace(
                        "{1}",
                        formatTime(clockAt(hours, b.start_minute + QUARTER)),
                      ),
                    lines: [
                      [
                        t("statsWeatherArrivals"),
                        formatCount(b.arrivals, lang),
                      ],
                    ],
                  },
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
                <StartMarks domain={domain} startHour={startHour} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted-foreground)", fillOpacity: 0.1 }}
                  content={(props) => <MeteogramTooltip {...props} />}
                />
                <Bar
                  dataKey="arrivals"
                  fill="var(--color-arrivals)"
                  radius={1}
                  barSize={hourWidth / 4 - 2}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
      {!rained && (
        <p className="py-2 text-center text-sm text-muted-foreground">
          {t("statsWeatherNoRain")}
        </p>
      )}
      {arrivals === undefined ? (
        <Skeleton
          data-testid="meteogram-arrivals-skeleton"
          className="h-24 w-full"
        />
      ) : (
        !arrivalsCharted && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t(
              arrivals === null
                ? "statsWeatherArrivalsFailed"
                : "statsWeatherNoArrivals",
            )}
          </p>
        )
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
