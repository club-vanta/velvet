import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/domain/session";
import { groupMeetupsByTiming, useOrgMeetups } from "@/domain/meetup";
import { useLanguage } from "@/lib/i18n";
import { MeetupGroup } from "./components/MeetupGroup";
import { MeetupListSkeleton } from "./components/MeetupListSkeleton";
import { MeetupSortBar } from "./components/MeetupSortBar";
import { NewMeetupDialog } from "./components/NewMeetupDialog";
import { NoActiveOrg } from "./components/NoActiveOrg";
import { RetryAlert } from "./components/RetryAlert";
import {
  nextMeetupSort,
  sortMeetups,
  type MeetupSort,
} from "./lib/meetupListSort";

/** Every meetup of the org, grouped by timing, and the way to add one. */
export function MeetupsPage() {
  const { t } = useLanguage();
  const { activeOrg } = useOrg();
  const [searchParams, setSearchParams] = useSearchParams();
  // The dashboard's "New meetup" button links here with ?new=1.
  const [dialogOpen, setDialogOpen] = useState(
    () => searchParams.get("new") === "1",
  );
  const [sort, setSort] = useState<MeetupSort>(null);
  const orgId = activeOrg?.org_id ?? "";

  const { data, isLoading, isError, refetch } = useOrgMeetups(orgId);
  const meetups = data?.meetups ?? [];
  const grouped = groupMeetupsByTiming(meetups);

  if (!activeOrg) return <NoActiveOrg />;

  return (
    <div className="@container space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("meetups")}</h1>
        <Button onClick={() => setDialogOpen(true)} data-cy="meetups-new">
          {t("newMeetup")}
        </Button>
      </div>

      {isError && (
        <RetryAlert
          message={t("failedLoadMeetups")}
          onRetry={() => refetch()}
          data-cy="meetups-error"
        />
      )}

      <MeetupSortBar
        sort={sort}
        onSort={(col) => setSort((prev) => nextMeetupSort(prev, col))}
      />

      {isLoading && <MeetupListSkeleton />}

      {!isLoading && !isError && meetups.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center"
          data-cy="meetups-empty"
        >
          <p className="text-sm text-muted-foreground">
            {t("noMeetupsYetCreate")}
          </p>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            data-cy="meetups-empty-new"
          >
            {t("newMeetup")}
          </Button>
        </div>
      )}

      {/* With no sort picked, group by timing; a picked sort shows one flat
          list in that order. */}
      {sort ? (
        <MeetupGroup
          meetups={sortMeetups(meetups, sort)}
          data-cy="meetups-sorted"
        />
      ) : (
        <>
          <MeetupGroup
            title={t("upcomingMeetups")}
            meetups={grouped.upcoming}
            data-cy="meetups-upcoming"
          />
          <MeetupGroup
            title={t("pastMeetups")}
            meetups={grouped.past}
            data-cy="meetups-past"
          />
        </>
      )}

      <NewMeetupDialog
        orgId={orgId}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          if (searchParams.has("new")) setSearchParams({}, { replace: true });
        }}
      />
    </div>
  );
}
