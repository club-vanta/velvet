import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { meetupTiming, useRelativeDay } from "@/domain/meetup";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { DateTile } from "./DateTile";
import { MazmoUrlLink } from "./MazmoUrlLink";
import { MeetupBadges } from "./MeetupBadges";
import { MeetupLocation } from "./MeetupLocation";

type Meetup = components["schemas"]["MeetupPublic"];

/**
 * The meetup's title card: its date, name and badges, where it happens and
 * its Mazmo event, with the meetup's tools in a band below (`toolbar`).
 */
export function MeetupHeader({
  orgId,
  meetup,
  canEditLocation,
  toolbar,
}: {
  orgId: string;
  meetup: Meetup;
  canEditLocation: boolean;
  toolbar: ReactNode;
}) {
  const { t } = useLanguage();
  const relativeDay = useRelativeDay();
  const timing = meetupTiming(meetup.date);

  return (
    <section
      aria-labelledby="meetup-title"
      className="relative isolate overflow-hidden rounded-xl border bg-card text-card-foreground"
      data-cy="meetup-header"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 -z-10 h-40",
          timing === "today"
            ? "bg-[radial-gradient(ellipse_at_top_left,--theme(--color-emerald-500/22%),transparent_65%)]"
            : "bg-[radial-gradient(ellipse_at_top_left,--theme(--color-foreground/7%),transparent_65%)]",
        )}
      />
      {/* Below @md everything stacks on one centered axis: the date tile,
          the title and dates, then the location and Mazmo link set apart by
          a rule. From @md the tile sits to the left, centered against the
          text column. */}
      <div className="flex flex-col items-center gap-3 px-4 py-5 text-center @md:grid @md:grid-cols-[auto_1fr] @md:items-start @md:gap-x-6 @md:gap-y-2 @md:px-6 @md:pt-6 @md:text-left">
        <div className="@md:row-span-2 @md:self-center">
          <DateTile date={meetup.date} timing={timing} size="lg" />
        </div>
        <div className="w-full min-w-0 space-y-2 @md:col-start-2">
          <h1
            id="meetup-title"
            className="text-2xl leading-tight font-semibold tracking-tight break-words @md:text-3xl"
            data-cy="meetup-title"
          >
            {meetup.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground @md:justify-start">
            <span data-cy="meetup-date">
              {formatDate(meetup.date)}
              {/* The "Today" badge already says it for today's meetup. */}
              {timing !== "today" && (
                <span className="text-muted-foreground/70">
                  {" "}
                  ({relativeDay(meetup.date)})
                </span>
              )}
            </span>
            <MeetupBadges meetup={meetup} timing={timing} />
          </div>
        </div>
        <div className="w-full min-w-0 space-y-2 border-t pt-3 empty:hidden @md:col-start-2 @md:border-t-0 @md:pt-0">
          <MeetupLocation
            orgId={orgId}
            meetup={meetup}
            canEdit={canEditLocation}
          />
          <MazmoUrlLink
            url={meetup.mazmo_meetup_url}
            text={t("goToMazmoEvent")}
            className="max-w-full text-xs text-muted-foreground"
          />
        </div>
      </div>
      {toolbar}
    </section>
  );
}
