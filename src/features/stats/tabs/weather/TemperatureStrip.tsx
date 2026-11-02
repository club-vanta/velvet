import { Area, ComposedChart, Line, YAxis } from "recharts";
import type { components } from "@/api/types";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { formatMeasure, hourCenter, type Domain } from "./meteogramData";
import {
  METEOGRAM_CONFIG,
  STRIP_MARGIN,
  Y_AXIS_WIDTH,
} from "./meteogramLayout";
import { MeteogramTooltip } from "./MeteogramTooltip";
import { StartMarks } from "./StartMarks";
import { TimeAxis } from "./TimeAxis";

type Hour = components["schemas"]["WeatherHourPublic"];

/** The temperature and how it felt, hour by hour, with the gap between them shaded. */
export function TemperatureStrip({
  hours,
  domain,
  startHour,
  labelled,
}: {
  hours: Hour[];
  domain: Domain;
  startHour: number;
  /** Whether this is the last strip, which carries the hour labels. */
  labelled: boolean;
}) {
  const { t, lang } = useLanguage();
  const data = hours.map((h) => ({
    x: hourCenter(h),
    tip: {
      title: formatTime(h.time),
      lines: [
        [t("weatherTemp"), formatMeasure(h.temperature, "°C", lang)],
        [
          t("weatherFeelsLike"),
          formatMeasure(h.apparent_temperature, "°C", lang),
        ],
      ] satisfies [string, string][],
    },
    temperature: h.temperature,
    apparent: h.apparent_temperature,
    // The shaded gap between the two lines, only where both are known.
    gap:
      h.temperature === null || h.apparent_temperature === null
        ? null
        : [h.apparent_temperature, h.temperature],
  }));

  return (
    <ChartContainer
      data-cy="stats-meteogram-temperature"
      config={METEOGRAM_CONFIG}
      className="aspect-auto h-28 w-full"
    >
      <ComposedChart data={data} margin={STRIP_MARGIN}>
        <TimeAxis domain={domain} hours={hours} labelled={labelled} />
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
  );
}
