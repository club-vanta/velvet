import {
  makeMeetup,
  makeMeetupGuest,
  makeMeetupStats,
  type Role,
} from "../../../src/tests/factories";
import { formatDate } from "../../../src/lib/format";
import {
  stubGuestProfile,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({
  id: "m-1",
  name: "Alter Night",
  date: "2026-10-01T22:00:00Z",
  mazmo_meetup_url: "https://mazmo.net/+eventos/alter-night",
  requires_payment: true,
});
const OTHER = makeMeetup({ id: "m-2", name: "Spookink II" });
const LUNA = makeMeetupGuest({
  guest: { id: "g-luna", displayname: "Luna", mazmo_handle: "luna" },
});

describe("Meetup detail", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  it("shows the meetup's header facts and its Mazmo event", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");

    cy.getBySel("meetup-header").within(() => {
      cy.getBySel("meetup-title").should("have.text", "Alter Night");
      cy.getBySel("meetup-date").should(
        "contain.text",
        formatDate(MEETUP.date),
      );
      cy.getBySel("meetup-badge-paid").should("have.text", "Paid event");
      cy.getBySel("meetup-badge-finalized").should("not.exist");
      cy.getBySel("meetup-location-none").should(
        "have.text",
        "No location yet",
      );
      cy.getBySel("meetup-mazmo-link")
        .should("have.text", "Go to the event on Mazmo")
        .and("have.attr", "href", MEETUP.mazmo_meetup_url)
        .and("have.attr", "target", "_blank")
        .and("have.attr", "rel", "noreferrer");
    });
  });

  it("shows placeholders while the meetup and its guests load", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}", {
      body: MEETUP,
      delay: 600,
    }).as("meetup");
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/guests", {
      body: { total: 1, guests: [LUNA] },
      delay: 600,
    }).as("guests");
    cy.visit("/meetups/m-1");

    cy.getBySel("meetup-header-loading").should("be.visible");
    cy.getBySel("guest-list-loading").should("have.length", 5);
    cy.wait(["@meetup", "@guests"]);
    cy.getBySel("meetup-header-loading").should("not.exist");
    cy.getBySel("guest-list-loading").should("not.exist");
    cy.getBySel("guest-row-g-luna").should("be.visible");
  });

  it("says when the meetup does not exist, with a retry", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/meetups/{meetup_id}", {
      statusCode: 404,
      detail: "Meetup not found",
    }).as("meetup");
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/meetups/{meetup_id}/guests",
      { statusCode: 404, detail: "Meetup not found" },
    ).as("guests");
    cy.visit("/meetups/unknown");

    cy.getBySel("meetup-error")
      .should("contain.text", "Failed to load meetup.")
      .findBySel("retry")
      .should("be.visible");
    cy.getBySel("guest-list-error").should(
      "contain.text",
      "Failed to load guest list.",
    );
    cy.getBySel("guest-list-empty").should("not.exist");
    // Without the meetup there are no tools, weather or stats to offer.
    cy.getBySel("meetup-toolbar").should("not.exist");
    cy.getByRole("region", { name: "Weather" }).should("not.exist");
    cy.getBySel("meetup-stats").should("not.exist");
  });

  it("loads the meetup again from the retry", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    cy.stubApiError("GET", "/organizations/{org_id}/meetups/{meetup_id}", {
      statusCode: 500,
    }).as("meetupFailed");
    cy.visit("/meetups/m-1");
    cy.getBySel("meetup-error").should("be.visible");

    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    cy.getBySel("meetup-error").findBySel("retry").click();
    cy.wait("@meetup");
    cy.getBySel("meetup-error").should("not.exist");
    cy.getBySel("meetup-title").should("have.text", "Alter Night");
  });

  it("loads the guest list again from its retry", () => {
    stubMeetupPage({ meetup: MEETUP });
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/meetups/{meetup_id}/guests",
      { statusCode: 500 },
    ).as("guestsFailed");
    cy.visit("/meetups/m-1");
    cy.wait("@meetup");
    cy.getBySel("guest-list-error").should("be.visible");
    // A failed load is not an empty list: no "sync to load guests" advice.
    cy.getBySel("guest-list-empty").should("not.exist");

    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    cy.getBySel("guest-list-error").findBySel("retry").click();
    cy.wait("@guests");
    cy.getBySel("guest-list-error").should("not.exist");
    cy.getBySel("guest-row-g-luna").should("be.visible");
  });

  it("asks for a sync when the meetup has no guests yet", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [] });
    visitMeetup("m-1");

    cy.getBySel("guest-list-empty").should(
      "have.text",
      "No guests yet. Sync from Mazmo to load the RSVP list.",
    );
    // Stats and the list tools only show once there is someone to count.
    cy.getBySel("meetup-stats").should("not.exist");
    cy.getByRole("searchbox", { name: "Search guest list…" }).should(
      "not.exist",
    );
  });

  it("shows the meetup's stats", () => {
    stubMeetupPage({
      meetup: MEETUP,
      guests: [LUNA],
      stats: makeMeetupStats({
        attendance: {
          total_rsvps: 12,
          arrived_count: 3,
          not_arrived_count: 9,
          walkin_count: 2,
        },
        cancellations: { cancelled_count: 4, cancelled_but_paid_count: 1 },
        guest_types: {
          normal_count: 7,
          invited_count: 2,
          vendor_count: 1,
          staff_count: 2,
        },
        payment: {
          paid_count: 5,
          unpaid_count: 2,
          exempt_from_payment_count: 5,
        },
      }),
    });
    visitMeetup("m-1");
    cy.wait("@stats");

    cy.getByRole("region", { name: "Check-ins" }).within(() => {
      cy.getBySel("meetup-stats-arrived").should("have.text", "3 / 12");
      cy.getBySel("meetup-stats-percent").should("have.text", "25%");
      cy.getBySel("stat-not-arrived").should("have.text", "9");
      cy.getBySel("stat-walkins").should("have.text", "2");
    });
    cy.getByRole("region", { name: "Guest types" }).within(() => {
      cy.getBySel("stat-normal").should("have.text", "7");
      cy.getBySel("stat-invited").should("have.text", "2");
      cy.getBySel("stat-vendor").should("have.text", "1");
      cy.getBySel("stat-staff").should("have.text", "2");
    });
    cy.getByRole("region", { name: "Payment" }).within(() => {
      cy.getBySel("stat-paid").should("have.text", "5");
      cy.getBySel("stat-unpaid").should("have.text", "2");
      cy.getBySel("stat-exempt").should("have.text", "5");
      cy.getBySel("stat-cancelled-paid").should("have.text", "1");
    });
  });

  it("leaves the payment card out of a free meetup's stats", () => {
    stubMeetupPage({
      meetup: { ...MEETUP, requires_payment: false },
      guests: [LUNA],
    });
    visitMeetup("m-1");
    cy.wait("@stats");

    cy.getByRole("region", { name: "Check-ins" }).should("be.visible");
    cy.getByRole("region", { name: "Payment" }).should("not.exist");
  });

  it("explains a stats failure and retries", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/meetups/{meetup_id}/stats",
      { statusCode: 500 },
    ).as("statsFailed");
    visitMeetup("m-1");

    cy.getBySel("meetup-stats-error").should(
      "contain.text",
      "Failed to load meetup stats.",
    );
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    cy.getBySel("meetup-stats-error").findBySel("retry").click();
    cy.wait("@stats");
    cy.getBySel("meetup-stats").should("be.visible");
  });

  it("opens a guest's profile from their name, with a link to the full page", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    stubGuestProfile(LUNA, [MEETUP]);
    visitMeetup("m-1");

    cy.getBySel("guest-row-g-luna").findBySel("guest-name").click();
    cy.wait(["@profileGuest", "@profileMeetups"]);
    cy.getBySel("guest-profile-sheet").within(() => {
      cy.getByRole("heading", { name: "Luna" }).should("be.visible");
      // The meetup the sheet is open on is named, not linked to itself.
      cy.contains("This meetup").should("be.visible");
      cy.getByRole("link", { name: "Alter Night" }).should("not.exist");
      cy.getBySel("guest-profile-open-full").should(
        "have.attr",
        "href",
        "/guests/g-luna",
      );
    });
    cy.checkA11yAA('[data-cy="guest-profile-sheet"]');

    cy.getBySel("guest-profile-open-full").click();
    cy.location("pathname").should("eq", "/guests/g-luna");
  });

  it("opens the profile from the row menu too", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    stubGuestProfile(LUNA, [MEETUP]);
    visitMeetup("m-1");

    cy.getBySel("guest-row-g-luna").findBySel("guest-actions").click();
    cy.getByRole("menuitem", { name: "View profile", native: false }).click();
    cy.getBySel("guest-profile-sheet")
      .should("be.visible")
      .within(() => cy.getByRole("heading", { name: "Luna" }));
  });

  it("starts fresh when the profile sheet leads to another meetup", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    stubGuestProfile(LUNA, [MEETUP, OTHER]);
    visitMeetup("m-1");
    cy.getByRole("searchbox", { name: "Search guest list…" }).type("lu");
    cy.getBySel("guest-row-g-luna").findBySel("guest-name").click();
    cy.wait("@profileMeetups");

    stubMeetupPage({ meetup: OTHER, guests: [LUNA] });
    cy.getBySel("guest-profile-sheet").within(() =>
      cy.getByRole("link", { name: "Spookink II" }).click(),
    );

    cy.location("pathname").should("eq", "/meetups/m-2");
    cy.wait(["@meetup", "@guests"]);
    cy.getBySel("meetup-title").should("have.text", "Spookink II");
    cy.getBySel("guest-profile-sheet").should("not.exist");
    cy.getByRole("searchbox", { name: "Search guest list…" }).should(
      "have.value",
      "",
    );
  });

  it("has no accessibility violations", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");
    cy.wait(["@stats", "@weather"]);
    cy.getBySel("meetup-stats").should("be.visible");
    cy.checkA11yAA();
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("stacks the header and lists guests as cards", () => {
      stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
      visitMeetup("m-1");

      cy.getBySel("meetup-title").should("be.visible");
      cy.getBySel("guest-table").should("not.exist");
      cy.getBySel("guest-cards")
        .should("have.attr", "aria-label", "Guest list")
        .findBySel("guest-row-g-luna")
        .should("be.visible");
      cy.getBySel("meetup-sync").should("be.visible");
      // The Shell's icon-only logout button has no name on phones (reported
      // to the Shell owner), so the scan covers the meetup page itself.
      cy.checkA11yAA('[data-cy="meetup-page"]');
    });
  });
});

describe("Meetup tools by role", () => {
  const cases: { role: Role; admin: boolean }[] = [
    { role: "staff", admin: false },
    { role: "orgAdmin", admin: true },
    { role: "siteAdmin", admin: true },
  ];

  cases.forEach(({ role, admin }) => {
    it(`gives ${role} the ${admin ? "admin" : "door"} tools`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
      visitMeetup("m-1");

      cy.getBySel("meetup-toolbar").within(() => {
        cy.getBySel("meetup-sync").should("have.text", "Sync from Mazmo");
        cy.getBySel("meetup-add-walkin").should("have.text", "Add walk-in");
        if (admin) {
          cy.getBySel("meetup-payment-toggle").should(
            "have.text",
            "Disable payment",
          );
          cy.getBySel("meetup-finalize").should("have.text", "Finalize meetup");
        } else {
          cy.getBySel("meetup-payment-toggle").should("not.exist");
          cy.getBySel("meetup-finalize").should("not.exist");
        }
      });
      cy.getBySel("meetup-location").within(() => {
        cy.getBySel("address-search").should(admin ? "exist" : "not.exist");
      });
    });
  });
});
