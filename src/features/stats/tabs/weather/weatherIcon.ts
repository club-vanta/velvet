import clearDay from "@bybas/weather-icons/production/line/all/clear-day.svg";
import clearNight from "@bybas/weather-icons/production/line/all/clear-night.svg";
import drizzle from "@bybas/weather-icons/production/line/all/drizzle.svg";
import fog from "@bybas/weather-icons/production/line/all/fog.svg";
import overcast from "@bybas/weather-icons/production/line/all/overcast.svg";
import partlyCloudyDay from "@bybas/weather-icons/production/line/all/partly-cloudy-day.svg";
import partlyCloudyNight from "@bybas/weather-icons/production/line/all/partly-cloudy-night.svg";
import rain from "@bybas/weather-icons/production/line/all/rain.svg";
import snow from "@bybas/weather-icons/production/line/all/snow.svg";
import thunderstorms from "@bybas/weather-icons/production/line/all/thunderstorms.svg";
import clearDayStill from "@bybas/weather-icons/design/line/export/wi_clear-day.svg";
import clearNightStill from "@bybas/weather-icons/design/line/export/wi_clear-night.svg";
import drizzleStill from "@bybas/weather-icons/design/line/export/wi_drizzle.svg";
import fogStill from "@bybas/weather-icons/design/line/export/wi_fog.svg";
import overcastStill from "@bybas/weather-icons/design/line/export/wi_overcast.svg";
import partlyCloudyDayStill from "@bybas/weather-icons/design/line/export/wi_partly-cloudy-day.svg";
import partlyCloudyNightStill from "@bybas/weather-icons/design/line/export/wi_partly-cloudy-night.svg";
import rainStill from "@bybas/weather-icons/design/line/export/wi_rain.svg";
import snowStill from "@bybas/weather-icons/design/line/export/wi_snow.svg";
import thunderstormsStill from "@bybas/weather-icons/design/line/export/wi_thunderstorms.svg";
import type { TranslationKey } from "@/lib/i18n";

export type WeatherIconName =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunderstorms";

/**
 * Each icon animated (Meteocons line set) and still, for viewers who ask
 * for reduced motion: the animation lives inside the SVG, so CSS cannot stop it.
 */
export const WEATHER_ICON_SRC: Record<
  WeatherIconName,
  { animated: string; still: string }
> = {
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
};

type Condition = {
  label: TranslationKey;
  day: WeatherIconName;
  night: WeatherIconName;
};

const same = (label: TranslationKey, name: WeatherIconName): Condition => ({
  label,
  day: name,
  night: name,
});

/** WMO weather codes as Open-Meteo sends them, grouped by what they look like. */
const CONDITIONS: [codes: readonly number[], condition: Condition][] = [
  [[0], { label: "weatherClear", day: "clear-day", night: "clear-night" }],
  [
    [1, 2],
    {
      label: "weatherPartlyCloudy",
      day: "partly-cloudy-day",
      night: "partly-cloudy-night",
    },
  ],
  [[3], same("weatherOvercast", "overcast")],
  [[45, 48], same("weatherFog", "fog")],
  [[51, 53, 55, 56, 57], same("weatherDrizzle", "drizzle")],
  [[61, 63, 65, 66, 67, 80, 81, 82], same("weatherRain", "rain")],
  [[71, 73, 75, 77, 85, 86], same("weatherSnow", "snow")],
  [[95, 96, 99], same("weatherStorm", "thunderstorms")],
];

/**
 * The icon and spoken label of one hour's weather. An unknown day flag counts
 * as night, since meetups happen at night. Null without a code or for a code
 * outside the WMO table.
 */
export function weatherIcon(
  code: number | null,
  isDay: boolean | null,
): { name: WeatherIconName; label: TranslationKey } | null {
  if (code === null) return null;
  const condition = CONDITIONS.find(([codes]) => codes.includes(code))?.[1];
  if (!condition) return null;
  return {
    name: isDay ? condition.day : condition.night,
    label: condition.label,
  };
}
