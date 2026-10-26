import { StatsNote } from "@/components/StatsNote";
import { formatDecimal } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type Weather = components["schemas"]["MeetupWeatherPublic"];
type Status = components["schemas"]["WeatherStatus"];

function WeatherValue({
  label,
  slot,
  children,
}: {
  label: string;
  slot: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        data-slot={slot}
        className="break-words text-base font-semibold tabular-nums sm:text-lg"
      >
        {children}
      </dd>
    </div>
  );
}

function WeatherValues({ weather }: { weather: Weather }) {
  const { t, lang } = useLanguage();
  const measure = (value: number | null, unit: string) =>
    value === null ? null : `${formatDecimal(value, lang)} ${unit}`;
  const noData = t("weatherNoData");

  const verdict =
    weather.rained === null
      ? null
      : weather.rained
        ? t("weatherRained")
        : t("weatherDry");
  const rain = [verdict, measure(weather.total_precipitation_mm, "mm")]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
      <WeatherValue label={t("weatherTemp")} slot="weather-temperature">
        {measure(weather.avg_temperature, "°C") ?? noData}
      </WeatherValue>
      <WeatherValue label={t("weatherFeelsLike")} slot="weather-feels-like">
        {measure(weather.avg_apparent_temperature, "°C") ?? noData}
      </WeatherValue>
      <WeatherValue label={t("weatherRain")} slot="weather-rain">
        {rain || noData}
      </WeatherValue>
      <WeatherValue label={t("weatherWind")} slot="weather-wind">
        {measure(weather.max_wind_kmh, "km/h") ?? noData}
      </WeatherValue>
    </dl>
  );
}

/**
 * The weather of a meetup's first six hours, or why it is not there yet. The
 * body shared by the meetup page card and the one-event stats tab.
 */
export function WeatherDetails({
  status,
  weather,
  canSetLocation,
}: {
  status: Status;
  weather: Weather | null;
  /** Whether the viewer can set the location, which changes the advice. */
  canSetLocation: boolean;
}) {
  const { t } = useLanguage();
  const reasons = {
    NO_LOCATION: canSetLocation
      ? t("weatherNoLocation")
      : t("weatherNoLocationStaff"),
    PENDING: t("weatherPending"),
    NOT_FETCHED: t("weatherNotFetched"),
  } as const;

  if (status === "OK" && weather) {
    return (
      <>
        <WeatherValues weather={weather} />
        <StatsNote>{t("weatherSource")}</StatsNote>
      </>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      {status === "OK" ? reasons.NOT_FETCHED : reasons[status]}
    </p>
  );
}
