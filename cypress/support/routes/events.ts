// Stubs for the audit log (/events, org admins and site admins).
import { makeEventLog, makeEventLogList } from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";

type EventLog = Schema<"EventLogPublic">;

/** `count` check-ins with ids from `firstId` down, newest first. */
export function makeEvents(count: number, firstId = count): EventLog[] {
  return Array.from({ length: count }, (_, i) =>
    makeEventLog({ id: firstId - i }),
  );
}

/**
 * Answers the audit log (`@getEvents`) with `events` and the org meetups
 * (`@getMeetups`), which name the meetup column.
 */
export function stubAuditLog({
  events = [makeEventLog()],
  total = events.length,
  meetups = [],
  delay,
}: {
  events?: EventLog[];
  total?: number;
  meetups?: Schema<"MeetupPublic">[];
  delay?: number;
} = {}): void {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: { total: meetups.length, meetups },
  }).as("getMeetups");
  cy.stubApi("GET", "/organizations/{org_id}/events/", {
    body: makeEventLogList(events, { total }),
    delay,
  }).as("getEvents");
}
