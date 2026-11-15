// Stubs for the dashboard (/dashboard), where every role lands after login.
import { makeMeetupStats } from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";

type Meetup = Schema<"MeetupPublic">;

/** A meetup date `days` from today at 22:00 local time, as the API sends it. */
export function meetupDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(22, 0, 0, 0);
  return date.toISOString();
}

/**
 * Answers the dashboard's requests: `@getMeetups` (newest first, like the
 * API), `@getGuests` (only the total is read) and `@getMeetupStats` for the
 * featured meetup.
 */
export function stubDashboard({
  meetups = [],
  guestsTotal = 0,
  stats = makeMeetupStats(),
  delay,
}: {
  meetups?: Meetup[];
  guestsTotal?: number;
  stats?: Schema<"MeetupStatsPublic">;
  delay?: number;
} = {}): void {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: { total: meetups.length, meetups },
    delay,
  }).as("getMeetups");
  cy.stubApi("GET", "/guests/", {
    body: { total: guestsTotal, guests: [] },
    delay,
  }).as("getGuests");
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
    body: stats,
    delay,
  }).as("getMeetupStats");
}
