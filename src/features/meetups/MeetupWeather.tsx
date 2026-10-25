import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsNote } from "@/features/stats/StatsNote";
import { formatDecimal } from "@/features/stats/statsFormat";
import { useMeetupWeather } from "@/hooks/useMeetupWeather";
import { useRefreshMeetupWeather } from "@/hooks/useRefreshMeetupWeather";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type Weather = components["schemas"]["MeetupWeatherPublic"];

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

function RefreshButton({
  orgId,
  meetupId,
}: {
  orgId: string;
  meetupId: string;
}) {
  const { t } = useLanguage();
  const refresh = useRefreshMeetupWeather(orgId, meetupId);
  const Icon = refresh.isPending ? Loader2 : RefreshCw;

  // aria-disabled instead of disabled, so the button keeps keyboard focus
  // while the request runs.
  return (
    <Button
      variant="outline"
      size="sm"
      aria-busy={refresh.isPending}
      aria-disabled={refresh.isPending}
      onClick={() => {
        if (refresh.isPending) return;
        refresh.mutate(undefined, {
          onSuccess: () => toast.success(t("weatherRefreshed")),
          onError: (err) => toast.error(err.message),
        });
      }}
    >
      <Icon
        data-testid={refresh.isPending ? "weather-spinner" : undefined}
        className={refresh.isPending ? "animate-spin" : undefined}
        aria-hidden="true"
      />
      {t("weatherRefresh")}
    </Button>
  );
}

/**
 * The weather of the first six hours of a meetup, or why it is not there yet.
 * A StatCard like the meetup stats beside it; org admins can fetch it again
 * once the backend says it is ready.
 */
export function MeetupWeather({
  orgId,
  meetupId,
  canRefresh,
}: {
  orgId: string;
  meetupId: string;
  canRefresh: boolean;
}) {
  const { t } = useLanguage();
  const weatherQ = useMeetupWeather(orgId, meetupId);

  if (weatherQ.isLoading) {
    return (
      <Skeleton
        role="status"
        aria-busy="true"
        aria-label={t("weatherTitle")}
        className="h-28 rounded-xl sm:h-32"
      />
    );
  }

  if (weatherQ.isError || !weatherQ.data) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {t("failedLoadWeather")}
        <Button variant="ghost" size="sm" onClick={() => weatherQ.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const { status, weather, ready } = weatherQ.data;
  const reasons = {
    NO_LOCATION: t("weatherNoLocation"),
    PENDING: t("weatherPending"),
    NOT_FETCHED: t("weatherNotFetched"),
  } as const;

  return (
    <StatCard title={t("weatherTitle")}>
      {status === "OK" && weather ? (
        <>
          <WeatherValues weather={weather} />
          <StatsNote>{t("weatherSource")}</StatsNote>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {status === "OK" ? reasons.NOT_FETCHED : reasons[status]}
        </p>
      )}
      {canRefresh && ready && (
        <RefreshButton orgId={orgId} meetupId={meetupId} />
      )}
    </StatCard>
  );
}
