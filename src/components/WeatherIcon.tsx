import clearDay from "@bybas/weather-icons/production/line/all/clear-day.svg";
import clearNight from "@bybas/weather-icons/production/line/all/clear-night.svg";
import drizzle from "@bybas/weather-icons/production/line/all/drizzle.svg";
import fog from "@bybas/weather-icons/production/line/all/fog.svg";
import overcast from "@bybas/weather-icons/production/line/all/overcast.svg";
import partlyCloudyDay from "@bybas/weather-icons/production/line/all/partly-cloudy-day.svg";
import partlyCloudyNight from "@bybas/weather-icons/production/line/all/partly-cloudy-night.svg";
import rain from "@bybas/weather-icons/production/line/all/rain.svg";
import snow from "@bybas/weather-icons/production/line/all/snow.svg";
import thermometer from "@bybas/weather-icons/production/line/all/thermometer.svg";
import thermometerColder from "@bybas/weather-icons/production/line/all/thermometer-colder.svg";
import thermometerWarmer from "@bybas/weather-icons/production/line/all/thermometer-warmer.svg";
import thunderstorms from "@bybas/weather-icons/production/line/all/thunderstorms.svg";
import wind from "@bybas/weather-icons/production/line/all/wind.svg";
import clearDayStill from "@bybas/weather-icons/design/line/export/wi_clear-day.svg";
import clearNightStill from "@bybas/weather-icons/design/line/export/wi_clear-night.svg";
import drizzleStill from "@bybas/weather-icons/design/line/export/wi_drizzle.svg";
import fogStill from "@bybas/weather-icons/design/line/export/wi_fog.svg";
import overcastStill from "@bybas/weather-icons/design/line/export/wi_overcast.svg";
import partlyCloudyDayStill from "@bybas/weather-icons/design/line/export/wi_partly-cloudy-day.svg";
import partlyCloudyNightStill from "@bybas/weather-icons/design/line/export/wi_partly-cloudy-night.svg";
import rainStill from "@bybas/weather-icons/design/line/export/wi_rain.svg";
import snowStill from "@bybas/weather-icons/design/line/export/wi_snow.svg";
import thermometerStill from "@bybas/weather-icons/design/line/export/wi_thermometer.svg";
import thermometerColderStill from "@bybas/weather-icons/design/line/export/wi_thermometer-colder.svg";
import thermometerWarmerStill from "@bybas/weather-icons/design/line/export/wi_thermometer-warmer.svg";
import thunderstormsStill from "@bybas/weather-icons/design/line/export/wi_thunderstorms.svg";
import windStill from "@bybas/weather-icons/design/line/export/wi_wind.svg";

/**
 * Each icon animated (Meteocons line set) and still, for viewers who ask
 * for reduced motion: the animation lives inside the SVG, so CSS cannot stop it.
 */
const SRC = {
  "clear-day": { animated: clearDay, still: clearDayStill },
  "clear-night": { animated: clearNight, still: clearNightStill },
  "partly-cloudy-day": {
    animated: partlyCloudyDay,
    still: partlyCloudyDayStill,
  },
  "partly-cloudy-night": {
    animated: partlyCloudyNight,
    still: partlyCloudyNightStill,
  },
  overcast: { animated: overcast, still: overcastStill },
  fog: { animated: fog, still: fogStill },
  drizzle: { animated: drizzle, still: drizzleStill },
  rain: { animated: rain, still: rainStill },
  snow: { animated: snow, still: snowStill },
  thunderstorms: { animated: thunderstorms, still: thunderstormsStill },
  wind: { animated: wind, still: windStill },
  "thermometer-colder": {
    animated: thermometerColder,
    still: thermometerColderStill,
  },
  thermometer: { animated: thermometer, still: thermometerStill },
  "thermometer-warmer": {
    animated: thermometerWarmer,
    still: thermometerWarmerStill,
  },
} as const satisfies Record<string, { animated: string; still: string }>;

export type WeatherIconName = keyof typeof SRC;

/** A decorative weather icon, still when the viewer asks for less motion. */
export function WeatherIcon({
  name,
  className,
  "data-cy": dataCy,
}: {
  name: WeatherIconName;
  className?: string;
  "data-cy"?: string;
}) {
  return (
    <picture>
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet={SRC[name].still}
      />
      <img
        src={SRC[name].animated}
        alt=""
        data-icon={name}
        data-cy={dataCy}
        className={className}
      />
    </picture>
  );
}
