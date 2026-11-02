import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { GuestTypeBadge } from "@/components/GuestBadges";
import { formatDate, formatTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { ATTENDANCE_VIEW } from "../lib/attendanceView";
import { TimelineItem } from "./ProfileSection";

type GuestMeetup = components["schemas"]["GuestMeetupAttendancePublic"];

// The shared destructive badge text is under 4.5:1 on its tint in light
// mode, and "No fue" is the one signal this section exists for.
const NO_SHOW_BADGE_CLASS = "text-red-700 dark:text-red-300";

/** One meetup the guest signed up for, and whether they went. */
export function GuestMeetupItem({
  meetup,
  isCurrent,
}: {
  meetup: GuestMeetup;
  isCurrent: boolean;
}) {
  const { t } = useLanguage();
  const view = ATTENDANCE_VIEW[meetup.status];
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
    <TimelineItem
      marker={view.marker}
      data-cy={`guest-meetup-${meetup.meetup_id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isCurrent ? (
          // Linking the meetup page to itself would do nothing.
          <span className="font-medium break-words" data-cy="meetup-name">
            {meetup.name}
          </span>
        ) : (
          <Link
            to={`/meetups/${meetup.meetup_id}`}
            data-cy="meetup-name"
            className="rounded-sm font-medium break-words underline decoration-muted-foreground/40 underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {meetup.name}
          </Link>
        )}
        <Badge
          variant={view.badge}
          data-cy="meetup-status"
          className={
            meetup.status === "NO_SHOW" ? NO_SHOW_BADGE_CLASS : undefined
          }
        >
          {t(view.label)}
        </Badge>
        <GuestTypeBadge guestType={meetup.guest_type} />
        {isCurrent && (
          <span
            className="text-xs text-muted-foreground"
            data-cy="meetup-current"
          >
            {t("attendanceThisMeetup")}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground" data-cy="meetup-meta">
        {meta.join(" · ")}
      </p>
    </TimelineItem>
  );
}
