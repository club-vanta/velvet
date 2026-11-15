import type { components } from "@/api/types";
import type { StatsQuery } from "@/api/statsQuery";
import { parseApiDateTime } from "@/lib/apiDateTime";
import { localDay } from "./statsPeriod";

type Meetup = components["schemas"]["MeetupPublic"];

export type OfferedEvent = { meetup: Meetup; date: Date };

/**
 * The events the event filter offers for a period: finalized meetups whose
 * local day falls inside it (`to` is exclusive), newest first.
 */
export function offeredEvents(
  meetups: Meetup[],
  range: Pick<StatsQuery, "from" | "to">,
): OfferedEvent[] {
  return meetups
    .filter((m) => m.is_finalized)
    .map((m) => ({ meetup: m, date: parseApiDateTime(m.date) }))
    .filter(({ date }) => {
      const day = localDay(date);
      return (
        (!range.from || day >= range.from) && (!range.to || day < range.to)
      );
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
