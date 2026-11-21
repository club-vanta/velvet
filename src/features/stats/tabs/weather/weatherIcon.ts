import type { WeatherIconName } from "@/components/WeatherIcon";
import type { TranslationKey } from "@/lib/i18n";

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
