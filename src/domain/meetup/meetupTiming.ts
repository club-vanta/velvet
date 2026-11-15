import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

export type MeetupTiming = "today" | "upcoming" | "past";

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from today to `date`, in local time. */
export function daysFromToday(date: string, now = new Date()): number {
  return Math.round(
    (startOfDay(new Date(date)) - startOfDay(now)) / 86_400_000,
  );
}

/** By calendar day, so a meetup stays "today" for the whole night. */
export function meetupTiming(date: string, now = new Date()): MeetupTiming {
  const days = daysFromToday(date, now);
  if (days === 0) return "today";
  return days > 0 ? "upcoming" : "past";
}

/**
 * The meetup worth showing first: today's, else the nearest upcoming one,
 * else the most recent past one. Returns its timing alongside.
 */
export function featuredMeetup(
  meetups: readonly Meetup[],
  now = new Date(),
): { meetup: Meetup; timing: MeetupTiming } | null {
  let best: { meetup: Meetup; timing: MeetupTiming; days: number } | null =
    null;
  for (const meetup of meetups) {
    const days = daysFromToday(meetup.date, now);
    const timing = meetupTiming(meetup.date, now);
    if (!best) {
      best = { meetup, timing, days };
      continue;
    }
    // Rank: today, then upcoming (closest first), then past (latest first).
    const rank = (t: MeetupTiming) =>
      t === "today" ? 0 : t === "upcoming" ? 1 : 2;
    const better =
      rank(timing) < rank(best.timing) ||
      (rank(timing) === rank(best.timing) &&
        (timing === "upcoming" ? days < best.days : days > best.days));
    if (better) best = { meetup, timing, days };
  }
  return best && { meetup: best.meetup, timing: best.timing };
}

/**
 * Splits meetups into today-and-upcoming (soonest first) and past (latest
 * first), the order staff look for them in.
 */
export function groupMeetupsByTiming(
  meetups: readonly Meetup[],
  now = new Date(),
): { upcoming: Meetup[]; past: Meetup[] } {
  const upcoming: Meetup[] = [];
  const past: Meetup[] = [];
  for (const m of meetups) {
    (meetupTiming(m.date, now) === "past" ? past : upcoming).push(m);
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  past.sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, past };
}
