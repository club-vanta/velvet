import { useQuery } from "@tanstack/react-query";
import { Link, useMatch } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { GuestTypeBadge } from "@/components/GuestBadges";
import { api } from "@/api/client";
import { formatDate, formatTime } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { guestMeetupsKey } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import {
  SectionError,
  SectionSkeleton,
  SectionTitle,
  Timeline,
  TimelineItem,
  type TimelineMarker,
} from "./ProfileSection";

type GuestMeetup = components["schemas"]["GuestMeetupAttendancePublic"];
type AttendanceStatus = components["schemas"]["GuestAttendanceStatus"];
type Summary = components["schemas"]["GuestAttendanceSummary"];

// The backend decides the status; this only maps it to how it looks.
const STATUS_VIEW: Record<
  AttendanceStatus,
  {
    label: TranslationKey;
    marker: TimelineMarker;
    badge: "secondary" | "destructive" | "outline";
  }
> = {
  ATTENDED: {
    label: "attendanceAttended",
    marker: "filled",
    badge: "secondary",
  },
  WALKIN: { label: "walkinLabel", marker: "filled", badge: "secondary" },
  NO_SHOW: {
    label: "attendanceNoShow",
    marker: "danger",
    badge: "destructive",
  },
  CANCELLED: {
    label: "attendanceCancelled",
    marker: "hollow",
    badge: "outline",
  },
  UPCOMING: {
    label: "attendanceUpcoming",
    marker: "faint",
    badge: "outline",
  },
};

// The shared destructive badge text is under 4.5:1 on its tint in light
// mode, and "No fue" is the one signal this section exists for.
const NO_SHOW_BADGE_CLASS = "text-red-700 dark:text-red-300";

function SummaryLine({ summary }: { summary: Summary }) {
  const { t } = useLanguage();
  const items = [
    {
      label: STATUS_VIEW.ATTENDED.label,
      count: summary.attended,
      // Walk-ins are part of attended, not a separate bucket.
      note:
        summary.walkin > 0
          ? `(${t(STATUS_VIEW.WALKIN.label)}: ${summary.walkin})`
          : null,
      danger: false,
    },
    {
      label: STATUS_VIEW.NO_SHOW.label,
      count: summary.no_show,
      note: null,
      danger: true,
    },
    {
      label: STATUS_VIEW.CANCELLED.label,
      count: summary.cancelled,
      note: null,
      danger: false,
    },
    {
      label: STATUS_VIEW.UPCOMING.label,
      count: summary.upcoming,
      note: null,
      danger: false,
    },
  ].filter((item) => item.count > 0);

  return (
    <div role="group" aria-label={t("guestMeetupsSummary")}>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <dt>{t(item.label)}</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums text-foreground",
                item.danger && "text-destructive",
              )}
            >
              {item.count}
            </dd>
            {item.note && <dd className="text-xs">{item.note}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

function MeetupItem({
  meetup,
  isCurrent,
}: {
  meetup: GuestMeetup;
  isCurrent: boolean;
}) {
  const { t } = useLanguage();
  const view = STATUS_VIEW[meetup.status];
  const meta = [
    formatDate(meetup.date),
    meetup.status === "WALKIN"
      ? t("attendanceNoSignup")
      : t("attendanceSignedUp").replace("{0}", formatDate(meetup.rsvp_time)),
    meetup.arrival_time
      ? t("attendanceArrived").replace("{0}", formatTime(meetup.arrival_time))
      : null,
  ].filter(Boolean);

  return (
    <TimelineItem marker={view.marker}>
      <div className="flex flex-wrap items-center gap-2">
        {isCurrent ? (
          // Linking the meetup page to itself would do nothing.
          <span className="font-medium break-words">{meetup.name}</span>
        ) : (
          <Link
            to={`/meetups/${meetup.meetup_id}`}
            className="rounded-sm font-medium break-words underline decoration-muted-foreground/40 underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {meetup.name}
          </Link>
        )}
        <Badge
          variant={view.badge}
          className={
            meetup.status === "NO_SHOW" ? NO_SHOW_BADGE_CLASS : undefined
          }
        >
          {t(view.label)}
        </Badge>
        <GuestTypeBadge guestType={meetup.guest_type} />
        {isCurrent && (
          <span className="text-xs text-muted-foreground">
            {t("attendanceThisMeetup")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
    </TimelineItem>
  );
}

/**
 * The meetups of this org the guest signed up for or walked into, newest
 * first, with whether they went. Meant for spotting people who keep signing
 * up and not showing up.
 */
export function GuestMeetups({
  guestId,
  orgId,
  headingAs,
}: {
  guestId: string;
  orgId: string;
  headingAs: "h2" | "h3";
}) {
  const { t } = useLanguage();
  // Set when the profile is open in the meetup page's side sheet.
  const currentMeetupId = useMatch("/meetups/:id")?.params.id;
  const meetupsQ = useQuery({
    queryKey: guestMeetupsKey(orgId, guestId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/guests/{guest_id}/meetups",
        { params: { path: { org_id: orgId, guest_id: guestId } } },
      );
      if (error) throw new Error(t("failedLoadGuestMeetups"));
      return data;
    },
    enabled: !!orgId,
  });

  // Without an active org there is nothing to scope the meetups to.
  if (!orgId) return null;

  return (
    <section className="space-y-3">
      <SectionTitle as={headingAs}>{t("guestMeetups")}</SectionTitle>
      {meetupsQ.isLoading && <SectionSkeleton />}
      {meetupsQ.isError && (
        <SectionError
          message={t("failedLoadGuestMeetups")}
          onRetry={() => void meetupsQ.refetch()}
        />
      )}
      {meetupsQ.data && meetupsQ.data.meetups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("guestMeetupsEmpty")}
        </p>
      )}
      {meetupsQ.data && meetupsQ.data.meetups.length > 0 && (
        <>
          <SummaryLine summary={meetupsQ.data.summary} />
          <Timeline>
            {meetupsQ.data.meetups.map((meetup) => (
              <MeetupItem
                key={meetup.meetup_id}
                meetup={meetup}
                isCurrent={meetup.meetup_id === currentMeetupId}
              />
            ))}
          </Timeline>
        </>
      )}
    </section>
  );
}
