import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { meetupTiming, useRelativeDay } from "@/domain/meetup";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";
import { DateTile } from "./DateTile";
import { MazmoUrlLink } from "./MazmoUrlLink";
import { MeetupBadges } from "./MeetupBadges";

type Meetup = components["schemas"]["MeetupPublic"];

/**
 * One meetup in a list. The name is the link to the meetup, stretched over
 * the whole row so any click opens it; the Mazmo link sits above that layer.
 */
export function MeetupRow({ meetup }: { meetup: Meetup }) {
  const { t } = useLanguage();
  const relativeDay = useRelativeDay();
  const timing = meetupTiming(meetup.date);

  return (
    <li
      className="group relative flex items-center gap-4 px-4 py-3 transition-colors focus-within:bg-muted/40 hover:bg-muted/40"
      data-cy={`meetup-row-${meetup.id}`}
    >
      <DateTile date={meetup.date} timing={timing} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/meetups/${meetup.id}`}
            className={cn(
              "font-medium break-words outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset",
              timing === "past" && "text-foreground/85",
            )}
            data-cy="meetup-row-link"
          >
            {meetup.name}
          </Link>
          <MeetupBadges meetup={meetup} timing={timing} />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          <span data-cy="meetup-row-date">
            {formatDate(meetup.date)}
            {/* The "Today" badge already says it for today's meetup. */}
            {timing !== "today" && (
              <span className="text-muted-foreground/70">
                {" "}
                ({relativeDay(meetup.date)})
              </span>
            )}
          </span>
          <MazmoUrlLink
            url={meetup.mazmo_meetup_url}
            className="max-w-full text-xs @md:max-w-sm"
          />
        </div>
      </div>
      <span className="hidden shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground @sm:inline-flex">
        {t("view")}
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
    </li>
  );
}
