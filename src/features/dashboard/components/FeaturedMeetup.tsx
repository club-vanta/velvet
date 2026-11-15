import { Link } from "react-router-dom";
import { DoorOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { components } from "@/api/types";
import { type MeetupTiming, useRelativeDay } from "@/domain/meetup";
import { DateTile, MazmoUrlLink, MeetupBadges } from "@/features/meetups";
import { formatDate } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FeaturedStats } from "./FeaturedStats";

type Meetup = components["schemas"]["MeetupPublic"];

const FEATURED_LABEL: Record<MeetupTiming, TranslationKey> = {
  today: "featuredToday",
  upcoming: "featuredNext",
  past: "featuredLast",
};

/**
 * The meetup staff most likely came for, as a pass-style panel: today's,
 * else the next one, else the last one, with its live numbers.
 */
export function FeaturedMeetup({
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
      data-cy="dashboard-featured"
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
          <p
            className="text-sm text-muted-foreground"
            data-cy="dashboard-featured-label"
          >
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
          data-cy="dashboard-open-meetup"
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
