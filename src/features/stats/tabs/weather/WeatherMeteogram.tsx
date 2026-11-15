import { useState } from "react";
import type { components } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { ChartTextTable } from "../../components/ChartTextTable";
import { formatCount, NO_VALUE } from "../../lib/statsFormat";
import { ArrivalsStrip } from "./ArrivalsStrip";
import {
  arrivalsInDomain,
  formatMeasure,
  hourRows,
  meteogramDomain,
  startHourOffset,
} from "./meteogramData";
import { MeteogramIconRow } from "./MeteogramIconRow";
import { HOUR_WIDTHS, Y_AXIS_WIDTH } from "./meteogramLayout";
import { MeteogramLegend } from "./MeteogramLegend";
import { RainStrip } from "./RainStrip";
import { StripTitle } from "./StripTitle";
import { TemperatureStrip } from "./TemperatureStrip";
import { weatherIcon } from "./weatherIcon";

type Hour = components["schemas"]["WeatherHourPublic"];
type Bucket = components["schemas"]["ArrivalBucketPublic"];

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
  const strip = { hours, domain, startHour };

  return (
    <div className="space-y-1">
      <MeteogramLegend
        zoom={zoom}
        maxZoom={HOUR_WIDTHS.length - 1}
        onZoom={setZoom}
      />
      <div
        role="group"
        data-cy="stats-meteogram-scroll"
        aria-labelledby={labelledBy}
        // A scroll container must be focusable so the keyboard can scroll it
        // when the chart is wider than the card (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div
          data-cy="stats-meteogram-content"
          className="space-y-1"
          style={{ minWidth: Y_AXIS_WIDTH + hours.length * hourWidth }}
        >
          <MeteogramIconRow hours={hours} />
          <StripTitle>{t("statsTemperatureAxis")}</StripTitle>
          <TemperatureStrip {...strip} labelled={labelled === "temperature"} />
          {rained && (
            <>
              <StripTitle>{t("statsWeatherRainAxis")}</StripTitle>
              <RainStrip
                {...strip}
                labelled={labelled === "rain"}
                hourWidth={hourWidth}
              />
            </>
          )}
          {arrivalsCharted && (
            <>
              <StripTitle>{t("statsWeatherArrivalsAxis")}</StripTitle>
              <ArrivalsStrip
                {...strip}
                buckets={charted}
                hourWidth={hourWidth}
              />
            </>
          )}
        </div>
      </div>
      {!rained && (
        <p
          data-cy="stats-meteogram-no-rain"
          className="py-2 text-center text-sm text-muted-foreground"
        >
          {t("statsWeatherNoRain")}
        </p>
      )}
      {arrivals === undefined ? (
        <Skeleton
          data-cy="stats-meteogram-arrivals-skeleton"
          className="h-24 w-full"
        />
      ) : (
        !arrivalsCharted && (
          <p
            data-cy="stats-meteogram-arrivals-note"
            className="py-4 text-center text-sm text-muted-foreground"
          >
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
              icon ? t(icon.label) : NO_VALUE,
              formatMeasure(r.temperature, "°C", lang),
              formatMeasure(r.apparent_temperature, "°C", lang),
              formatMeasure(r.precipitation_mm, "mm", lang),
              formatCount(r.arrivals, lang),
            ],
          };
        })}
      />
    </div>
  );
}
