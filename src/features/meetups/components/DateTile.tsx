import { LOCALE, useLanguage } from "@/lib/i18n";
import type { MeetupTiming } from "@/domain/meetup";
import { cn } from "@/lib/utils";

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
