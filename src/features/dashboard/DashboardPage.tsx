import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { DoorOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fact, FactStrip } from "@/components/FactStrip";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useOrg } from "@/lib/org";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { featuredMeetup, type MeetupTiming } from "@/lib/meetupTiming";
import { cn } from "@/lib/utils";
import {
  DateTile,
  MazmoUrlLink,
  MeetupBadges,
  MeetupRow,
} from "@/features/meetups/MeetupListItem";
import { useMeetupStats } from "@/hooks/useMeetupStats";
import { useRelativeDay } from "@/hooks/useRelativeDay";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

const FEATURED_LABEL: Record<MeetupTiming, TranslationKey> = {
  today: "featuredToday",
  upcoming: "featuredNext",
  past: "featuredLast",
};

function FeaturedStats({
  orgId,
  meetupId,
}: {
  orgId: string;
  meetupId: string;
}) {
  const { t } = useLanguage();
  const statsQ = useMeetupStats(orgId, meetupId);

  if (statsQ.isLoading) {
    return (
      <div className="grid gap-px border-t @sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3 @md:px-5 @md:py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground @md:px-6">
        {t("failedLoadStats")}
        <Button variant="ghost" size="sm" onClick={() => statsQ.refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const { attendance, cancellations } = statsQ.data;
  const percent =
    attendance.total_rsvps > 0
      ? Math.round((attendance.arrived_count / attendance.total_rsvps) * 100)
      : 0;

  return (
    <FactStrip cols={4} className="border-t">
      <Fact label={t("statsRsvps")}>
        <span className="tabular-nums">{attendance.total_rsvps}</span>
      </Fact>
      <Fact
        label={t("statsCheckIns")}
        hint={
          <span className="flex items-center gap-2">
            <Progress
              value={percent}
              aria-label={t("statsCheckIns")}
              getAriaValueText={() => `${percent}%`}
              className="hidden w-16 gap-0 @sm:flex"
            />
            {t("statsArrivedPercent").replace("{0}", String(percent))}
          </span>
        }
      >
        <span className="tabular-nums">{attendance.arrived_count}</span>
      </Fact>
      <Fact label={t("statsNotArrived")}>
        <span className="tabular-nums">{attendance.not_arrived_count}</span>
      </Fact>
      <Fact label={t("statsCancellations")}>
        <span className="tabular-nums">{cancellations.cancelled_count}</span>
      </Fact>
    </FactStrip>
  );
}

/**
 * The meetup staff most likely came for, as a pass-style panel: today's,
 * else the next one, else the last one, with its live numbers.
 */
function FeaturedMeetup({
  orgId,
  meetup,
  timing,
}: {
  orgId: string;
  meetup: Meetup;
  timing: MeetupTiming;
}) {
  const { t } = useLanguage();
  const relativeDay = useRelativeDay();

  return (
    <section
      aria-labelledby="featured-meetup-title"
      className="relative isolate overflow-hidden rounded-xl border bg-card text-card-foreground"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-44",
          timing === "today"
            ? "bg-[radial-gradient(ellipse_at_top_left,--theme(--color-emerald-500/22%),transparent_65%)]"
            : "bg-[radial-gradient(ellipse_at_top_left,--theme(--color-foreground/7%),transparent_65%)]",
        )}
      />

      <div className="flex flex-col items-start gap-4 px-4 pt-6 pb-5 @md:flex-row @md:items-center @md:gap-6 @md:px-6 @md:pt-8">
        <DateTile date={meetup.date} timing={timing} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t(FEATURED_LABEL[timing])}
            {timing !== "today" && (
              <span className="text-muted-foreground/70">
                {" "}
                ({relativeDay(meetup.date)})
              </span>
            )}
          </p>
          <h2
            id="featured-meetup-title"
            className="text-2xl font-semibold leading-tight tracking-tight break-words @md:text-3xl"
          >
            {meetup.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span>{formatDate(meetup.date)}</span>
            <MeetupBadges meetup={meetup} timing={timing} />
          </div>
        </div>
        {/* The one thing staff come to the dashboard for, so it is the
            loudest element on the page: full width on phones, large on
            the right from @md up, green like the date tile when it's today. */}
        <Link
          to={`/meetups/${meetup.id}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 w-full gap-2 rounded-lg px-6 text-base font-semibold shadow-lg @md:w-auto @md:shrink-0 [&_svg:not([class*='size-'])]:size-5",
            timing === "today" &&
              "bg-emerald-500 text-emerald-950 shadow-emerald-500/25 hover:bg-emerald-400",
          )}
        >
          <DoorOpen aria-hidden="true" />
          {t("openMeetup")}
        </Link>
      </div>

      <FeaturedStats orgId={orgId} meetupId={meetup.id} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t bg-muted/30 px-4 py-3 text-sm text-muted-foreground @md:px-6">
        <MazmoUrlLink
          url={meetup.mazmo_meetup_url}
          className="max-w-full text-xs"
        />
      </div>
    </section>
  );
}

function OrgTotals({
  meetups,
  guests,
  pending,
}: {
  meetups: { value?: number; loading: boolean };
  guests: { value?: number; loading: boolean };
  pending?: { value?: number; loading: boolean };
}) {
  const { t } = useLanguage();
  const value = (v: { value?: number; loading: boolean }) =>
    v.loading ? (
      <Skeleton className="mt-1 h-6 w-10" />
    ) : (
      <span className="tabular-nums">{v.value ?? 0}</span>
    );

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h2 className="sr-only">{t("orgTotals")}</h2>
      <FactStrip cols={pending ? 3 : 2}>
        <Fact label={t("totalMeetups")}>{value(meetups)}</Fact>
        <Fact label={t("totalGuests")}>{value(guests)}</Fact>
        {pending && (
          <Fact label={t("pendingApprovals")}>
            {pending.loading ? (
              <Skeleton className="mt-1 h-6 w-10" />
            ) : (
              <Link
                to="/staff"
                className={cn(
                  "tabular-nums underline-offset-4 hover:underline",
                  (pending.value ?? 0) > 0 &&
                    "text-amber-600 dark:text-amber-400",
                )}
              >
                {pending.value ?? 0}
              </Link>
            )}
          </Fact>
        )}
      </FactStrip>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { activeOrg } = useOrg();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";
  const orgId = activeOrg?.org_id ?? "";

  const meetupsQ = useQuery({
    queryKey: ["meetups", orgId],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/",
        { params: { path: { org_id: orgId } } },
      );
      if (error) throw new Error("Failed to load meetups");
      return data;
    },
    enabled: !!orgId,
  });

  const guestsQ = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/");
      if (error) throw new Error("Failed to load guests");
      return data;
    },
  });

  const pendingQ = useQuery({
    queryKey: ["staff", "pending"],
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/pending");
      if (error) throw new Error("Failed to load pending staff");
      return data;
    },
    enabled: isSiteAdmin,
  });

  const recentMeetups = meetupsQ.data?.meetups.slice(0, 5) ?? [];
  const featured = featuredMeetup(meetupsQ.data?.meetups ?? []);

  if (!activeOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("noOrganization")}</p>
      </div>
    );
  }

  return (
    <div className="@container space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("dashboard")}</h1>
        <Button onClick={() => navigate("/meetups?new=1")}>
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
        meetups={{ value: meetupsQ.data?.total, loading: meetupsQ.isLoading }}
        guests={{ value: guestsQ.data?.total, loading: guestsQ.isLoading }}
        pending={
          isSiteAdmin
            ? { value: pendingQ.data?.length, loading: pendingQ.isLoading }
            : undefined
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("recentMeetups")}
        </h2>

        {meetupsQ.isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              {t("failedLoadMeetups")}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => meetupsQ.refetch()}
              >
                {t("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-xl border bg-card">
          {meetupsQ.isLoading && (
            <ul className="divide-y">
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

          {!meetupsQ.isLoading && recentMeetups.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("noMeetupsYet")}
            </p>
          )}

          {recentMeetups.length > 0 && (
            <ul className="divide-y">
              {recentMeetups.map((meetup) => (
                <MeetupRow key={meetup.id} meetup={meetup} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
