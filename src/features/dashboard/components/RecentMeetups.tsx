import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { components } from "@/api/types";
import { MeetupRow } from "@/features/meetups";
import { useLanguage } from "@/lib/i18n";

type Meetup = components["schemas"]["MeetupPublic"];

/** The org's latest meetups, as the meetups list shows them. */
export function RecentMeetups({
  meetups,
  isLoading,
  isError,
  onRetry,
}: {
  meetups: Meetup[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t("recentMeetups")}
      </h2>

      {isError && (
        <Alert variant="destructive" data-cy="dashboard-meetups-error">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadMeetups")}
            <Button variant="ghost" size="sm" onClick={onRetry}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading && (
          <ul className="divide-y" data-cy="dashboard-meetups-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-14 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && meetups.length === 0 && (
          <p
            className="px-4 py-8 text-center text-sm text-muted-foreground"
            data-cy="dashboard-meetups-empty"
          >
            {t("noMeetupsYet")}
          </p>
        )}

        {meetups.length > 0 && (
          <ul className="divide-y" data-cy="dashboard-recent-meetups">
            {meetups.map((meetup) => (
              <MeetupRow key={meetup.id} meetup={meetup} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
