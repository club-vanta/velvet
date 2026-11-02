import { Bar, BarChart, LabelList, YAxis } from "recharts";
import type { components } from "@/api/types";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatDecimal, formatTime } from "@/lib/format";
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

/** The rain of each hour as a bar, labelled with its millimetres. */
export function RainStrip({
  hours,
  domain,
  startHour,
  labelled,
  hourWidth,
}: {
  hours: Hour[];
  domain: Domain;
  startHour: number;
  /** Whether this is the last strip, which carries the hour labels. */
  labelled: boolean;
  /** Pixels per hour at the current zoom. */
  hourWidth: number;
}) {
  const { t, lang } = useLanguage();
  const data = hours.map((h) => ({
    x: hourCenter(h),
    rain: h.precipitation_mm,
    tip: {
      title: formatTime(h.time),
      lines: [
        [t("weatherRain"), formatMeasure(h.precipitation_mm, "mm", lang)],
      ] satisfies [string, string][],
    },
  }));

  return (
    <ChartContainer
      data-cy="stats-meteogram-rain"
      config={METEOGRAM_CONFIG}
      className="aspect-auto h-16 w-full"
    >
      <BarChart data={data} margin={{ ...STRIP_MARGIN, top: 14 }}>
        <TimeAxis domain={domain} hours={hours} labelled={labelled} />
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
  );
}
