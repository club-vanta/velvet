import type { components } from "@/api/types";
import type { WeatherIconName } from "@/components/WeatherIcon";
import type { TranslationKey } from "@/lib/i18n";

type Weather = components["schemas"]["MeetupWeatherPublic"];

type SummaryIcon = Extract<
  WeatherIconName,
  "rain" | "wind" | "thermometer-colder" | "thermometer" | "thermometer-warmer"
>;

/** From here the wind reads as windy: Beaufort 5, a fresh breeze. */
export const WINDY_KMH = 29;

/**
 * The stats temperature bands as words: the same lower bounds, inclusive, as
 * the backend's band_for_temperature, applied to the same avg_temperature.
 */
const TEMPERATURE_WORDS: [below: number, key: TranslationKey][] = [
  [10, "weatherNightCold"],
  [15, "weatherNightCool"],
  [20, "weatherNightMild"],
  [25, "weatherNightWarm"],
  [Infinity, "weatherNightHot"],
];

/**
 * A meetup's weather in a few words and one icon, from the averages the
 * meetup page already has. There is no sky condition here (no cloud cover or
 * weather code), so the icon only claims what the numbers show: rain, wind,
 * or the temperature. A missing rain or wind value drops its words; without a
 * temperature there are no words at all, since they start with the night.
 */
export function weatherSummary(weather: Weather): {
  icon: SummaryIcon | null;
  parts: TranslationKey[];
} {
  const temp = weather.avg_temperature;
  const windy =
    weather.max_wind_kmh !== null && weather.max_wind_kmh >= WINDY_KMH;

  const parts: TranslationKey[] = [];
  if (temp !== null) {
    const word = TEMPERATURE_WORDS.find(([below]) => temp < below);
    if (word) parts.push(word[1]);
  }
  if (weather.rained !== null) {
    parts.push(weather.rained ? "weatherWithRain" : "weatherWithoutRain");
  }
  if (windy) parts.push("weatherWithWind");

  let icon: SummaryIcon | null = null;
  if (weather.rained) icon = "rain";
  else if (windy) icon = "wind";
  else if (temp !== null) {
    icon =
      temp < 15
        ? "thermometer-colder"
        : temp < 20
          ? "thermometer"
          : "thermometer-warmer";
  }

  // The words read as a sentence only when they start with the night.
  return { icon, parts: temp === null ? [] : parts };
}
