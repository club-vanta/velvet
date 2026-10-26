import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { LOCALE, useRelativeDay } from "@/hooks/useRelativeDay";
import { meetupTiming, type MeetupTiming } from "@/lib/meetupTiming";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

const TILE_SIZE = {
  md: { box: "size-14 rounded-lg", month: "text-[0.65rem]", day: "text-xl" },
  lg: {
    box: "size-20 rounded-xl @md:size-24",
    month: "text-xs",
    day: "text-3xl @md:text-4xl",
  },
} as const;

// Today glows, upcoming dates read as active, past ones step back.
const TILE_TIMING: Record<MeetupTiming, string> = {
  today:
    "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-card dark:text-emerald-300",
  upcoming: "border-foreground/25 bg-background/60 text-foreground",
  past: "border-border bg-muted/40 text-muted-foreground",
};

/**
 * A meetup's date as a small calendar sheet: the month on top, the day
 * large. It plays the role the avatar plays on a guest profile.
 */
export function DateTile({
  date,
  timing,
  size = "md",
}: {
  date: string;
  timing: MeetupTiming;
  size?: keyof typeof TILE_SIZE;
}) {
  const { lang } = useLanguage();
  const d = new Date(date);
  const month = d.toLocaleDateString(LOCALE[lang], { month: "short" });
  const sizes = TILE_SIZE[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 flex-col items-center justify-center border leading-none select-none",
        sizes.box,
        TILE_TIMING[timing],
      )}
    >
      <span className={cn("font-medium lowercase opacity-80", sizes.month)}>
        {month.replace(".", "")}
      </span>
      <span className={cn("mt-1 font-semibold tabular-nums", sizes.day)}>
        {d.getDate()}
      </span>
    </span>
  );
}

export function MeetupBadges({
  meetup,
  timing,
}: {
  meetup: Meetup;
  timing: MeetupTiming;
}) {
  const { t } = useLanguage();
  return (
    <>
      {timing === "today" && (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          {t("meetupToday")}
        </Badge>
      )}
      {meetup.requires_payment && (
        <Badge variant="outline">{t("paidEvent")}</Badge>
      )}
      {meetup.is_finalized && (
        <Badge variant="secondary">{t("meetupFinalized")}</Badge>
      )}
    </>
  );
}

/** The Mazmo URL without the scheme, which is the same on every meetup. */
export function MazmoUrlLink({
  url,
  text,
  className,
}: {
  url: string;
  /** Shown instead of the bare URL; it then names the link on its own. */
  text?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      aria-label={text ? undefined : t("openOnMazmo").replace("{0}", url)}
      className={cn(
        "relative z-10 inline-flex min-w-0 items-center gap-1 rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <span className="truncate">
        {text ?? url.replace(/^https?:\/\//, "")}
      </span>
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

/**
 * One meetup in a list. The name is the link to the meetup, stretched over
 * the whole row so any click opens it; the Mazmo link sits above that layer.
 */
export function MeetupRow({ meetup }: { meetup: Meetup }) {
  const { t } = useLanguage();
  const relativeDay = useRelativeDay();
  const timing = meetupTiming(meetup.date);

  return (
    <li className="group relative flex items-center gap-4 px-4 py-3 transition-colors focus-within:bg-muted/40 hover:bg-muted/40">
      <DateTile date={meetup.date} timing={timing} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/meetups/${meetup.id}`}
            className={cn(
              "font-medium break-words outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset",
              timing === "past" && "text-foreground/85",
            )}
          >
            {meetup.name}
          </Link>
          <MeetupBadges meetup={meetup} timing={timing} />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          <span>
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
