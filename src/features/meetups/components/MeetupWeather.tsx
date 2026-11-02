import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherDetails } from "@/components/WeatherDetails";
import { useLanguage } from "@/lib/i18n";
import { useMeetupWeather } from "../api/useMeetupWeather";
import { WeatherRefreshButton } from "./WeatherRefreshButton";

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
    // Same card and grid as the loaded state, so nothing shifts on arrival.
    return (
      <StatCard title={t("weatherTitle")}>
        <div
          role="status"
          aria-busy="true"
          aria-label={t("weatherTitle")}
          className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4"
          data-cy="meetup-weather-loading"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20 sm:h-7" />
            </div>
          ))}
        </div>
      </StatCard>
    );
  }

  // A failed background refetch keeps showing the data it already has.
  if (!weatherQ.data) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10"
        data-cy="meetup-weather-error"
      >
        {t("failedLoadWeather")}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => weatherQ.refetch()}
          data-cy="retry"
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  const { status, weather, ready } = weatherQ.data;

  return (
    <StatCard title={t("weatherTitle")}>
      <WeatherDetails
        status={status}
        weather={weather}
        canSetLocation={canRefresh}
      />
      {canRefresh && ready && (
        <WeatherRefreshButton orgId={orgId} meetupId={meetupId} />
      )}
    </StatCard>
  );
}
