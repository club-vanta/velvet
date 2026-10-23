import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { formatDate, formatDateTime } from "@/lib/format";
import { GUEST_TYPE_LABEL, isGuestType } from "@/lib/guestType";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { guestMeetupsKey } from "@/lib/queryKeys";
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
    <dl
      aria-label={t("guestMeetupsSummary")}
      className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
    >
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <dt>{t(item.label)}</dt>
          <dd
            className={
              item.danger
                ? "font-semibold tabular-nums text-destructive"
                : "font-semibold tabular-nums text-foreground"
            }
          >
            {item.count}
          </dd>
          {item.note && <dd className="text-xs">{item.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function MeetupItem({ meetup }: { meetup: GuestMeetup }) {
  const { t } = useLanguage();
  const view = STATUS_VIEW[meetup.status];
  const guestType =
    isGuestType(meetup.guest_type) && meetup.guest_type !== "NORMAL"
      ? meetup.guest_type
      : null;
  const meta = [
    formatDate(meetup.date),
    meetup.status === "WALKIN"
      ? t("attendanceNoSignup")
      : t("attendanceSignedUp").replace("{0}", formatDate(meetup.rsvp_time)),
    meetup.arrival_time
      ? t("attendanceArrived").replace(
          "{0}",
          formatDateTime(meetup.arrival_time),
        )
      : null,
  ].filter(Boolean);

  return (
    <TimelineItem marker={view.marker}>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/meetups/${meetup.meetup_id}`}
          className="rounded-sm font-medium break-words underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {meetup.name}
        </Link>
        <Badge variant={view.badge}>{t(view.label)}</Badge>
        {guestType && (
          <Badge variant="outline">{t(GUEST_TYPE_LABEL[guestType])}</Badge>
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
      {meetupsQ.data && meetupsQ.data.total === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("guestMeetupsEmpty")}
        </p>
      )}
      {meetupsQ.data && meetupsQ.data.total > 0 && (
        <>
          <SummaryLine summary={meetupsQ.data.summary} />
          <Timeline>
            {meetupsQ.data.meetups.map((meetup) => (
              <MeetupItem key={meetup.meetup_id} meetup={meetup} />
            ))}
          </Timeline>
        </>
      )}
    </section>
  );
}
