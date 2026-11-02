// Stub sets for the meetup pages. Each function answers the requests one
// page or panel makes, with aliases the specs wait on. Later stubs in a test
// take precedence, so a spec can still override any single request.
import {
  makeMeetup,
  makeMeetupStats,
  makeMeetupWeatherStatus,
  type Schema,
} from "../../../src/tests/factories";

type Meetup = Schema<"MeetupPublic">;
type MeetupGuest = Schema<"MeetupGuestPublic">;

/** GET the org's meetups (@meetups). */
export function stubMeetupList(meetups: Meetup[]): void {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    body: { total: meetups.length, meetups },
  }).as("meetups");
}

export type MeetupPageData = {
  meetup?: Meetup;
  guests?: MeetupGuest[];
  stats?: Schema<"MeetupStatsPublic">;
  weather?: Schema<"MeetupWeatherStatusPublic">;
  /** The org's vanted list, read by the vanted check-in dialog. */
  banned?: Schema<"BannedGuestPublic">[];
};

/**
 * Everything the meetup page loads: the meetup (@meetup), its guest list
 * (@guests), stats (@stats), weather (@weather) and the org's vanted list
 * (@banned). Returns the meetup, so a spec can visit it.
 */
export function stubMeetupPage({
  meetup = makeMeetup(),
  guests = [],
  stats = makeMeetupStats(),
  weather = makeMeetupWeatherStatus(),
  banned = [],
}: MeetupPageData = {}): Meetup {
  const params = { meetup_id: meetup.id };
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}", {
    body: meetup,
    params,
  }).as("meetup");
  stubMeetupGuests(meetup.id, guests);
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
    body: stats,
    params,
  }).as("stats");
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/weather", {
    body: weather,
    params,
  }).as("weather");
  cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
    body: { total: banned.length, guests: banned },
  }).as("banned");
  return meetup;
}

/** GET a meetup's guest list (@guests), e.g. the refetch after a change. */
export function stubMeetupGuests(meetupId: string, guests: MeetupGuest[]) {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/guests", {
    body: { total: guests.length, guests },
    params: { meetup_id: meetupId },
  }).as("guests");
}

/** Opens the meetup page and waits until the meetup and its list are in. */
export function visitMeetup(meetupId: string): void {
  cy.visit(`/meetups/${meetupId}`);
  cy.wait(["@meetup", "@guests"]);
}

/**
 * The guest profile sheet's requests: the guest (@profileGuest), their name
 * history and their meetups in the org (@profileMeetups), as RSVPs to each
 * of `meetups`.
 */
export function stubGuestProfile(row: MeetupGuest, meetups: Meetup[]): void {
  const params = { guest_id: row.guest.id };
  cy.stubApi("GET", "/guests/{guest_id}", { body: row.guest, params }).as(
    "profileGuest",
  );
  cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
    body: { total: 0, history: [] },
    params,
  });
  cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
    body: {
      total: meetups.length,
      summary: {
        attended: 0,
        walkin: 0,
        no_show: 0,
        cancelled: 0,
        upcoming: meetups.length,
      },
      meetups: meetups.map((meetup) => ({
        meetup_id: meetup.id,
        name: meetup.name,
        date: meetup.date,
        status: "UPCOMING" as const,
        rsvp_time: row.rsvp.rsvp_time,
        arrival_time: null,
        guest_type: "NORMAL" as const,
      })),
    },
    params,
  }).as("profileMeetups");
}

/** Asserts the app showed a toast with exactly `title`. */
export function expectToast(
  title: string,
  type: "success" | "error" = "success",
): void {
  cy.get(`[data-sonner-toast][data-type="${type}"] [data-title]`).should(
    "have.text",
    title,
  );
}

/** GET the global guest directory the walk-in picker searches (@directory). */
export function stubGuestDirectory(guests: Schema<"GuestPublic">[]): void {
  cy.stubApi("GET", "/guests/", {
    body: { total: guests.length, guests },
  }).as("directory");
}
