import rain from "@bybas/weather-icons/production/line/all/rain.svg";
import thermometer from "@bybas/weather-icons/production/line/all/thermometer.svg";
import thermometerColder from "@bybas/weather-icons/production/line/all/thermometer-colder.svg";
import thermometerWarmer from "@bybas/weather-icons/production/line/all/thermometer-warmer.svg";
import wind from "@bybas/weather-icons/production/line/all/wind.svg";
import rainStill from "@bybas/weather-icons/design/line/export/wi_rain.svg";
import thermometerStill from "@bybas/weather-icons/design/line/export/wi_thermometer.svg";
import thermometerColderStill from "@bybas/weather-icons/design/line/export/wi_thermometer-colder.svg";
import thermometerWarmerStill from "@bybas/weather-icons/design/line/export/wi_thermometer-warmer.svg";
import windStill from "@bybas/weather-icons/design/line/export/wi_wind.svg";
import type { components } from "@/api/types";
import { useLanguage } from "@/lib/i18n";
import { type SummaryIcon, weatherSummary } from "../lib/weatherSummary";

type Weather = components["schemas"]["MeetupWeatherPublic"];

/** Animated, and still for viewers who ask for reduced motion (as in stats). */
const ICON_SRC: Record<SummaryIcon, { animated: string; still: string }> = {
  rain: { animated: rain, still: rainStill },
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
};

/** The night's weather at a glance: one icon and a few words over the values. */
export function WeatherSummary({ weather }: { weather: Weather }) {
  const { t } = useLanguage();
  const { icon, parts } = weatherSummary(weather);
  if (!icon && parts.length === 0) return null;

  return (
    <div className="flex items-center gap-2" data-cy="weather-summary">
      {icon && (
        <picture>
          <source
            media="(prefers-reduced-motion: reduce)"
            srcSet={ICON_SRC[icon].still}
          />
          <img
            src={ICON_SRC[icon].animated}
            alt=""
            data-icon={icon}
            className="-my-2 size-14 shrink-0"
          />
        </picture>
      )}
      {parts.length > 0 && (
        <p className="text-base font-medium" data-cy="weather-summary-text">
          {parts.map((key) => t(key)).join(", ")}
        </p>
      )}
    </div>
  );
}
