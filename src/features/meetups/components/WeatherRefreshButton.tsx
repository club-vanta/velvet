import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useRefreshMeetupWeather } from "../api/useRefreshMeetupWeather";

/** Fetches the meetup's weather again; toasts the outcome. */
export function WeatherRefreshButton({
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
      data-cy="weather-refresh"
    >
      <Icon
        className={refresh.isPending ? "animate-spin" : undefined}
        aria-hidden="true"
      />
      {t("weatherRefresh")}
    </Button>
  );
}
