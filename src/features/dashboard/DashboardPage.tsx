import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllGuests } from "@/domain/guest";
import { featuredMeetup, useOrgMeetups } from "@/domain/meetup";
import { useAuth, useOrg } from "@/domain/session";
import { usePendingStaff } from "@/features/staff";
import { useLanguage } from "@/lib/i18n";
import { FeaturedMeetup } from "./components/FeaturedMeetup";
import { OrgTotals } from "./components/OrgTotals";
import { RecentMeetups } from "./components/RecentMeetups";

const RECENT_MEETUPS = 5;

export function DashboardPage() {
  const { user } = useAuth();
  const { activeOrg } = useOrg();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const orgId = activeOrg?.org_id ?? "";

  const meetupsQ = useOrgMeetups(orgId);
  const guestsQ = useAllGuests();
  const pendingQ = usePendingStaff({ enabled: isSiteAdmin });

  const meetups = meetupsQ.data?.meetups ?? [];
  const featured = featuredMeetup(meetups);

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground" data-cy="dashboard-no-org">
          {t("noOrganization")}
        </p>
      </div>
    );
  }

  return (
    <div className="@container space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
        <Button
          data-cy="dashboard-new-meetup"
          onClick={() => navigate("/meetups?new=1")}
        >
          {t("newMeetup")}
        </Button>
      </div>

      {meetupsQ.isLoading && <Skeleton className="h-72 w-full rounded-xl" />}
      {featured && (
        <FeaturedMeetup
          orgId={orgId}
          meetup={featured.meetup}
          timing={featured.timing}
        />
      )}

      <OrgTotals
        meetups={{
          value: meetupsQ.data?.total,
          loading: meetupsQ.isLoading,
          error: meetupsQ.isError,
        }}
        guests={{
          value: guestsQ.data?.total,
          loading: guestsQ.isLoading,
          error: guestsQ.isError,
        }}
        pending={
          isSiteAdmin
            ? {
                value: pendingQ.data?.length,
                loading: pendingQ.isLoading,
                error: pendingQ.isError,
              }
            : undefined
        }
      />

      <RecentMeetups
        meetups={meetups.slice(0, RECENT_MEETUPS)}
        isLoading={meetupsQ.isLoading}
        isError={meetupsQ.isError}
        onRetry={() => meetupsQ.refetch()}
      />
    </div>
  );
}
