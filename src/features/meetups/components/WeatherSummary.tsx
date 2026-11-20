import type { components } from "@/api/types";
import { WeatherIcon } from "@/components/WeatherIcon";
import { useLanguage } from "@/lib/i18n";
import { weatherSummary } from "../lib/weatherSummary";

type Weather = components["schemas"]["MeetupWeatherPublic"];

/** The night's weather at a glance: one icon and a few words over the values. */
export function WeatherSummary({ weather }: { weather: Weather }) {
  const { t } = useLanguage();
  const { icon, parts } = weatherSummary(weather);
  if (!icon && parts.length === 0) return null;

  return (
    <div className="flex items-center gap-2" data-cy="weather-summary">
      {icon && <WeatherIcon name={icon} className="-my-2 size-14 shrink-0" />}
      {parts.length > 0 && (
        <p className="text-base font-medium" data-cy="weather-summary-text">
          {parts.map((key) => t(key)).join(", ")}
        </p>
      )}
    </div>
  );
}
