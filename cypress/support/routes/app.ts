// Minimal stubs for the pages the Shell's navigation lands on. The app specs
// (routing, org switcher, language, phones) open these pages but do not test
// them, so each answers its requests with empty data. The feature specs own
// the pages' real flows.
import { makeOrg, type Schema } from "../../../src/tests/factories";

const emptyMeetups = { total: 0, meetups: [] };

/** /dashboard: the org's meetups and the guest total. */
export function stubDashboardPage(): void {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: emptyMeetups,
  }).as("meetups");
  cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } }).as(
    "guests",
  );
}

/** /meetups: the org's meetups. */
export function stubMeetupsPage(): void {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: emptyMeetups,
  }).as("meetups");
}

/** /guests: every guest and the org's banned list. */
export function stubGuestsPage(): void {
  cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } }).as(
    "guests",
  );
  cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
    body: { total: 0, guests: [] },
  }).as("bannedGuests");
}

/** /stats: the meetups of the event filter and the default (attendance) tab. */
export function stubStatsPage(): void {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: emptyMeetups,
  }).as("meetups");
  cy.stubApi("GET", "/organizations/{org_id}/stats/attendance", {
    body: {
      meetups: [],
      totals: {
        events: 0,
        signed_up: 0,
        cancelled: 0,
        attended: 0,
        walkin: 0,
        no_show: 0,
        cancellation_rate: null,
        no_show_rate: null,
        avg_signed_up_per_event: null,
        avg_attended_per_event: null,
      },
      comparison_kind: null,
      comparison: null,
    },
  }).as("attendanceStats");
}

/** /staff (site admins): every staff account. */
export function stubStaffPage(): void {
  cy.stubApi("GET", "/staff/", { body: [] }).as("staff");
}

/** /events: the audit log and the meetups of its filter. */
export function stubEventsPage(): void {
  cy.stubApi("GET", "/organizations/{org_id}/events/", {
    body: { total: 0, limit: 50, offset: 0, events: [] },
  }).as("events");
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: emptyMeetups,
  }).as("meetups");
}

/**
 * /organizations: site admins list them all, members read their own.
 * `orgs` answers both, so a test can show several organizations.
 */
export function stubOrganizationsPage(
  orgs: Schema<"OrgPublic">[] = [makeOrg()],
): void {
  cy.stubApi("GET", "/organizations/", {
    body: { total: orgs.length, organizations: orgs },
  }).as("organizations");
  for (const org of orgs) {
    cy.stubApi("GET", "/organizations/{org_id}", {
      body: org,
      params: { org_id: org.id },
    });
  }
}

/** Every page the nav can open, for specs that walk the whole nav. */
export function stubNavPages(): void {
  stubDashboardPage();
  stubGuestsPage();
  stubStatsPage();
  stubStaffPage();
  stubEventsPage();
  stubOrganizationsPage();
}
