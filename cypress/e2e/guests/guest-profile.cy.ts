import {
  makeGuest,
  makeGuestMeetupAttendance,
  makeGuestMeetups,
  makeMazmoProfile,
  makeNameHistory,
  makeNameHistoryEntry,
} from "../../../src/tests/factories";
import { formatFullDateTime } from "../../../src/lib/format";
import {
  shouldFitWidth,
  stubGuestProfile,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

const SYNCED_AT = "2026-10-18T03:00:00Z";
const LUNA = makeGuest({
  id: "guest-luna",
  displayname: "Luna",
  mazmo_handle: "luna",
  mazmo_user_id: 200003,
  instagram_username: "luna.ig",
  mazmo_profile: makeMazmoProfile({
    age: 31,
    gender: "WOMAN_CIS",
    pronoun: "FEMALE",
    synced_at: SYNCED_AT,
  }),
});

function visitLuna(options: Parameters<typeof stubGuestProfile>[1] = {}) {
  stubGuestProfile(LUNA, options);
  cy.visit("/guests/guest-luna");
  cy.wait("@getGuest");
}

describe("Guest profile", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  context("identity", () => {
    it("shows who the guest is and what their Mazmo profile says", () => {
      visitLuna();

      cy.getByRole("heading", { name: "Luna" }).should("match", "h1");
      cy.getByRole("link", { name: "@luna on Mazmo" })
        .should("have.attr", "href", "https://mazmo.net/@luna")
        .and("have.attr", "target", "_blank");
      cy.getBySel("guest-profile-pronoun").should("have.text", "she/her");
      cy.getBySel("guest-fact-gender-value").should("have.text", "Cis woman");
      cy.getBySel("guest-fact-age-value").should("have.text", "31 years");
      cy.getBySel("guest-fact-pronouns-value").should("have.text", "Feminine");
      cy.getBySel("guest-profile-mazmo-id").should("have.text", "200003");
      cy.getByRole("link", { name: "@luna.ig on Instagram" }).should(
        "have.attr",
        "href",
        "https://instagram.com/luna.ig",
      );
      cy.getBySel("guest-profile-synced-at").should(
        "have.text",
        `Mazmo data from ${formatFullDateTime(SYNCED_AT)}`,
      );
      cy.getBySel("guest-badge-vanted").should("not.exist");
    });

    it("says Not set for Mazmo facts the guest left empty", () => {
      stubGuestProfile({
        ...LUNA,
        instagram_username: null,
        mazmo_profile: makeMazmoProfile({
          age: null,
          gender: null,
          pronoun: null,
        }),
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-fact-gender-value").should("have.text", "Not set");
      cy.getBySel("guest-fact-age-value").should("have.text", "Not set");
      cy.getBySel("guest-fact-pronouns-value").should("have.text", "Not set");
      cy.getBySel("guest-profile-instagram").should("have.text", "Not set");
      cy.getBySel("guest-profile-pronoun").should("not.exist");
    });

    it("explains a guest with no Mazmo account", () => {
      stubGuestProfile(
        makeGuest({
          id: "guest-luna",
          displayname: "Luna",
          mazmo_handle: null,
          mazmo_user_id: null,
          mazmo_profile: null,
        }),
      );
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-profile-handle").should(
        "have.text",
        "No Mazmo account",
      );
      cy.getBySel("guest-profile-no-facts").should(
        "have.text",
        "No Mazmo account linked, so there is no Mazmo profile data.",
      );
      cy.getBySel("guest-profile-mazmo-id").should("have.text", "Not set");
      cy.getBySel("guest-profile-synced-at").should("not.exist");
    });

    it("explains a linked guest whose Mazmo data isn't synced yet", () => {
      stubGuestProfile({ ...LUNA, mazmo_profile: null });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-profile-no-facts").should(
        "have.text",
        "Mazmo profile data isn't synced yet. It shows up after the next sync of a meetup this guest RSVPed to.",
      );
      cy.getBySel("guest-fact-age").should("not.exist");
    });
  });

  context("flags", () => {
    it("shows the org vant with its reason", () => {
      visitLuna({
        banned: [vanted(LUNA, { banned_reason: "Aggressive at Alter #40" })],
      });

      cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
      cy.getBySel("guest-vant-title").should(
        "have.text",
        "Vanted in Club Vanta",
      );
      cy.getBySel("guest-vant-reason").should(
        "have.text",
        "Aggressive at Alter #40",
      );
    });

    it("calls out Mazmo's own ban, apart from org vants, without a dead link", () => {
      stubGuestProfile({
        ...LUNA,
        mazmo_profile: makeMazmoProfile({ mazmo_banned: true }),
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-mazmo-flag-title").should(
        "have.text",
        "Mazmo banned this account",
      );
      cy.getBySel("guest-badge-mazmo-banned").should(
        "have.text",
        "Banned on Mazmo",
      );
      cy.getBySel("guest-badge-vanted").should("not.exist");
      cy.getBySel("guest-profile-handle")
        .should("have.text", "@luna")
        .and("not.have.attr", "href");
    });

    it("calls out a Mazmo suspension", () => {
      stubGuestProfile({
        ...LUNA,
        mazmo_profile: makeMazmoProfile({ mazmo_suspended: true }),
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-mazmo-flag-title").should(
        "have.text",
        "Mazmo suspended this account",
      );
      cy.getBySel("guest-profile-handle").should("have.attr", "href");
    });

    it("marks a deleted Mazmo account and drops the dead link", () => {
      stubGuestProfile({
        ...LUNA,
        mazmo_profile: makeMazmoProfile({ mazmo_deleted: true }),
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-mazmo-deleted-title").should(
        "have.text",
        "This account no longer exists on Mazmo",
      );
      cy.getBySel("guest-badge-mazmo-deleted").should(
        "have.text",
        "Mazmo account deleted",
      );
      cy.getBySel("guest-profile-handle").should("not.have.attr", "href");
      cy.getBySel("guest-mazmo-flag-alert").should("not.exist");
    });
  });

  context("name history", () => {
    it("lists every name newest first, with source and who changed it", () => {
      visitLuna({
        history: makeNameHistory([
          makeNameHistoryEntry({ displayname: "Luna", source: "SYNC" }),
          makeNameHistoryEntry({
            displayname: "Luna P.",
            source: "MANUAL_EDIT",
            recorded_at: "2026-09-11T03:00:00Z",
            actor: { id: 1, username: "carla" },
          }),
          makeNameHistoryEntry({
            displayname: "Lu",
            source: "BACKFILL",
            recorded_at: "2026-08-01T03:00:00Z",
          }),
        ]),
      });
      cy.wait("@getHistory");

      cy.getBySel("guest-history")
        .findBySel("history-item")
        .should("have.length", 3);
      cy.getBySel("history-item")
        .eq(0)
        .within(() => {
          cy.getBySel("history-name").should("have.text", "Luna");
          cy.getBySel("history-current").should("have.text", "Current");
          cy.getBySel("history-meta").should(
            "have.text",
            `Mazmo sync · ${formatFullDateTime("2026-09-01T00:00:00Z")}`,
          );
        });
      cy.getBySel("history-item")
        .eq(1)
        .within(() => {
          cy.getBySel("history-current").should("not.exist");
          cy.getBySel("history-meta").should(
            "have.text",
            `Manual · by carla · ${formatFullDateTime("2026-09-11T03:00:00Z")}`,
          );
        });
      cy.getBySel("history-item")
        .eq(2)
        .findBySel("history-backfill-hint")
        .should(
          "have.text",
          "Name on record when history tracking started. The date is when tracking started, not when the name was set.",
        );
    });

    it("says so when there is no history", () => {
      visitLuna({ history: makeNameHistory([]) });

      cy.getBySel("guest-history-empty").should(
        "have.text",
        "No name history recorded.",
      );
    });

    it("shows an error with a retry that recovers the history", () => {
      stubGuestProfile(LUNA);
      cy.stubApiError("GET", "/guests/{guest_id}/displayname-history", {
        statusCode: 500,
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-history")
        .findBySel("section-error-message")
        .should("have.text", "Failed to load name history.");
      cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
        body: makeNameHistory(),
      }).as("getHistory");
      cy.getBySel("guest-history")
        .getByRole("button", { name: "Retry" })
        .click();

      cy.wait("@getHistory");
      cy.getBySel("guest-history")
        .findBySel("history-item")
        .should("have.length", 1);
    });
  });

  context("meetups", () => {
    const MEETUPS = makeGuestMeetups([
      makeGuestMeetupAttendance({
        meetup_id: "m-5",
        name: "Sadoplace",
        status: "UPCOMING",
      }),
      makeGuestMeetupAttendance({
        meetup_id: "m-4",
        name: "Cuerdas",
        status: "NO_SHOW",
      }),
      makeGuestMeetupAttendance({
        meetup_id: "m-3",
        name: "Munch Palermo",
        status: "ATTENDED",
        arrival_time: "2026-09-26T00:47:00Z",
        guest_type: "VENDOR",
      }),
      makeGuestMeetupAttendance({
        meetup_id: "m-2",
        name: "Septiembre",
        status: "CANCELLED",
      }),
      makeGuestMeetupAttendance({
        meetup_id: "m-1",
        name: "Munch Agosto",
        status: "WALKIN",
      }),
    ]);

    it("lists the org's meetups with how each went, linked to the meetup", () => {
      visitLuna({ meetups: MEETUPS });
      cy.wait("@getGuestMeetups");

      cy.getByRole("heading", { name: "Meetups" }).should("match", "h2");
      const expected = [
        ["m-5", "Sadoplace", "Upcoming"],
        ["m-4", "Cuerdas", "No-show"],
        ["m-3", "Munch Palermo", "Attended"],
        ["m-2", "Septiembre", "Cancelled"],
        ["m-1", "Munch Agosto", "Walk-in"],
      ];
      expected.forEach(([id, name, status]) => {
        cy.getBySel(`guest-meetup-${id}`).within(() => {
          cy.getBySel("meetup-name")
            .should("have.text", name)
            .and("have.attr", "href", `/meetups/${id}`);
          cy.getBySel("meetup-status").should("have.text", status);
        });
      });
      cy.getBySel("guest-meetup-m-3")
        .findBySel("guest-type-badge")
        .should("have.text", "Vendor");
      cy.getBySel("guest-meetup-m-4")
        .findBySel("guest-type-badge")
        .should("not.exist");
    });

    it("sums up attendance, with walk-ins counted inside attended", () => {
      visitLuna({ meetups: MEETUPS });

      const totals: [string, string][] = [
        ["ATTENDED", "2"],
        ["NO_SHOW", "1"],
        ["CANCELLED", "1"],
        ["UPCOMING", "1"],
      ];
      totals.forEach(([status, count]) => {
        cy.getBySel(`guest-meetups-total-${status}`)
          .findBySel("guest-meetups-count")
          .should("have.text", count);
      });
      cy.getBySel("guest-meetups-walkins").should("have.text", "(Walk-in: 1)");
    });

    it("says so when the guest never signed up in this org", () => {
      visitLuna({ meetups: makeGuestMeetups([]) });

      cy.getBySel("guest-meetups-empty").should(
        "have.text",
        "Hasn't signed up for any meetups in this organization.",
      );
      cy.getBySel("guest-meetups-summary").should("not.exist");
    });

    it("shows an error with a retry that recovers the meetups", () => {
      stubGuestProfile(LUNA);
      cy.stubApiError(
        "GET",
        "/organizations/{org_id}/guests/{guest_id}/meetups",
        { statusCode: 500 },
      );
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-meetups")
        .findBySel("section-error-message")
        .should("have.text", "Failed to load meetups.");
      cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
        body: MEETUPS,
      }).as("getGuestMeetups");
      cy.getBySel("guest-meetups")
        .getByRole("button", { name: "Retry" })
        .click();

      cy.wait("@getGuestMeetups");
      cy.getBySel("guest-meetup-m-5").should("be.visible");
    });
  });

  context("loading and errors", () => {
    it("shows a placeholder while the guest loads", () => {
      stubGuestProfile(LUNA);
      cy.stubApi("GET", "/guests/{guest_id}", { body: LUNA, delay: 1000 }).as(
        "getGuest",
      );
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-profile-loading").should("have.attr", "aria-busy");
      cy.wait("@getGuest");
      cy.getBySel("guest-profile-loading").should("not.exist");
      cy.getBySel("guest-profile-name").should("have.text", "Luna");
    });

    it("says an unknown guest id was not found, without a retry", () => {
      stubGuestProfile(LUNA);
      cy.stubApiError("GET", "/guests/{guest_id}", {
        statusCode: 404,
        detail: "Guest not found",
      }).as("getGuest");
      cy.visit("/guests/no-such-guest");

      cy.getByRole("heading", { name: "Guest not found" }).should(
        "match",
        "h1",
      );
      cy.getBySel("guest-profile-unavailable")
        .getByRole("button", { name: "Retry" })
        .should("not.exist");
      cy.get("@getGuest.all").should("have.length", 1);
    });

    it("offers a retry when the guest failed to load", () => {
      stubGuestProfile(LUNA);
      cy.stubApiError("GET", "/guests/{guest_id}", { statusCode: 500 });
      cy.visit("/guests/guest-luna");

      cy.getByRole("heading", { name: "Failed to load guest." }).should(
        "be.visible",
      );
      cy.stubApi("GET", "/guests/{guest_id}", { body: LUNA }).as("getGuest");
      cy.getByRole("button", { name: "Retry" }).click();

      cy.wait("@getGuest");
      cy.getBySel("guest-profile-name").should("have.text", "Luna");
    });
  });

  it("goes back to the directory", () => {
    visitLuna();
    stubGuestsPage({ guests: [LUNA] });

    cy.getBySel("guest-back").click();

    cy.location("pathname").should("eq", "/guests");
    cy.getBySel("guest-row-guest-luna").should("be.visible");
  });

  it("has no accessibility violations", () => {
    visitLuna({
      banned: [vanted(LUNA)],
      meetups: makeGuestMeetups([makeGuestMeetupAttendance()]),
    });
    cy.getBySel("guest-meetups-summary").should("be.visible");
    cy.checkA11yAA();
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("fits the profile in the screen", () => {
      visitLuna({ meetups: makeGuestMeetups([makeGuestMeetupAttendance()]) });

      cy.getBySel("guest-profile-name").should("be.visible");
      cy.getBySel("guest-fact-age").should("be.visible");
      shouldFitWidth("guest-page");
      cy.checkA11yAA('[data-cy="guest-page"]');
    });
  });
});
