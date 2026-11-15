import { Bar, BarChart, YAxis } from "recharts";
import type { components } from "@/api/types";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { formatCount } from "../../lib/statsFormat";
import { bucketCenter, clockAt, QUARTER, type Domain } from "./meteogramData";
import {
  METEOGRAM_CONFIG,
  STRIP_MARGIN,
  Y_AXIS_WIDTH,
} from "./meteogramLayout";
import { MeteogramTooltip } from "./MeteogramTooltip";
import { StartMarks } from "./StartMarks";
import { TimeAxis } from "./TimeAxis";

type Hour = components["schemas"]["WeatherHourPublic"];
type Bucket = components["schemas"]["ArrivalBucketPublic"];

/** The arrivals of every quarter hour inside the charted hours; always the last strip. */
export function ArrivalsStrip({
  hours,
  buckets,
  domain,
  startHour,
  hourWidth,
}: {
  hours: Hour[];
  /** The arrival buckets inside the domain. */
  buckets: Bucket[];
  domain: Domain;
  startHour: number;
  /** Pixels per hour at the current zoom. */
  hourWidth: number;
}) {
  const { t, lang } = useLanguage();
  const data = buckets.map((b) => ({
    x: bucketCenter(b),
    arrivals: b.arrivals,
    tip: {
      title: t("statsWeatherQuarter")
        .replace("{0}", formatTime(clockAt(hours, b.start_minute)))
        .replace("{1}", formatTime(clockAt(hours, b.start_minute + QUARTER))),
      lines: [
        [t("statsWeatherArrivals"), formatCount(b.arrivals, lang)],
      ] satisfies [string, string][],
    },
  }));

  return (
    <ChartContainer
      data-cy="stats-meteogram-arrivals"
      config={METEOGRAM_CONFIG}
      className="aspect-auto h-24 w-full"
    >
      <BarChart data={data} margin={STRIP_MARGIN}>
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
  );
}
