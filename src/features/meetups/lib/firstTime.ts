import type { components } from "@/api/types";

type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

// The stats count only the audience as visits, so staff and vendors are
// never "new" here either.
const AUDIENCE: ReadonlySet<string> = new Set(["NORMAL", "INVITED"]);

/**
 * Whether the guest comes to the org for the first time: no attendance at an
 * earlier finalized meetup, the same rule as the stats first-time figures.
 */
export function isFirstTime(mg: MeetupGuest): boolean {
  return mg.prior_visits === 0 && AUDIENCE.has(mg.rsvp.guest_type);
}

/** First-time guests still coming (RSVP not cancelled), and how many arrived. */
export function countFirstTime(guests: readonly MeetupGuest[]): {
  total: number;
  arrived: number;
} {
  let total = 0;
  let arrived = 0;
  for (const mg of guests) {
    if (mg.rsvp.cancelled_rsvp || !isFirstTime(mg)) continue;
    total++;
    if (mg.rsvp.has_arrived) arrived++;
  }
  return { total, arrived };
}
