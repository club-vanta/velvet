import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherDetails } from "@/components/WeatherDetails";
import { useMeetupWeather } from "@/hooks/useMeetupWeather";
import { useRefreshMeetupWeather } from "@/hooks/useRefreshMeetupWeather";
import { useLanguage } from "@/lib/i18n";

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
      className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      onClick={() => {
        if (refresh.isPending) return;
        refresh.mutate(undefined, {
          onSuccess: () => toast.success(t("weatherRefreshed")),
          onError: (err) => toast.error(err.message),
        });
      }}
    >
      <Icon
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
    // Same card and grid as the loaded state, so nothing shifts on arrival.
    return (
      <StatCard title={t("weatherTitle")}>
        <div
          role="status"
          aria-busy="true"
          aria-label={t("weatherTitle")}
          className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4"
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
      <div className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/10">
        {t("failedLoadWeather")}
        <Button variant="ghost" size="sm" onClick={() => weatherQ.refetch()}>
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
        <RefreshButton orgId={orgId} meetupId={meetupId} />
      )}
    </StatCard>
  );
}
