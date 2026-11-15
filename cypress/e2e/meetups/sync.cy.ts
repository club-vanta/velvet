import {
  makeMeetup,
  makeMeetupGuest,
  makeSyncResponse,
  type Role,
} from "../../../src/tests/factories";
import {
  expectToast,
  stubGuestDirectory,
  stubMeetupGuests,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({ id: "m-1", name: "Alter Night" });
const LUNA = makeMeetupGuest({ guest: { id: "g-luna", displayname: "Luna" } });

function stubSync(delay?: number) {
  cy.stubApi("POST", "/organizations/{org_id}/meetups/{meetup_id}/sync", {
    body: makeSyncResponse({ inserted: 3, skipped: 1, total_in_db: 4 }),
    params: { meetup_id: "m-1" },
    delay,
  }).as("sync");
}

describe("Sync with Mazmo", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  it("loads the RSVPs and says how many were new", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [] });
    visitMeetup("m-1");
    stubSync();
    stubMeetupGuests("m-1", [LUNA]);

    cy.getBySel("guest-list-empty").should("be.visible");
    cy.getBySel("meetup-sync").click();

    cy.wait("@sync")
      .its("request.url")
      .should("match", /\/meetups\/m-1\/sync$/);
    expectToast("Synced: 3 new guests added, 1 skipped");
    cy.wait("@guests");
    cy.getBySel("guest-list-empty").should("not.exist");
    cy.getBySel("guest-row-g-luna").should("be.visible");
  });

  it("refreshes the guest directory too, since a sync renames guests", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    stubGuestDirectory([LUNA.guest]);
    visitMeetup("m-1");
    // Load the directory once, so it sits fresh in the cache.
    cy.getBySel("meetup-add-walkin").click();
    cy.wait("@directory");
    cy.getBySel("walkin-dialog").findBySel("dialog-cancel").click();
    stubSync();

    cy.getBySel("meetup-sync").click();
    cy.wait("@sync");
    cy.getBySel("meetup-add-walkin").click();

    // Without the sync the 30-second cache would answer instead.
    cy.wait("@directory");
    cy.get("@directory.all").should("have.length", 2);
  });

  it("spins and waits while the sync runs", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");
    stubSync(800);

    cy.getBySel("meetup-sync").click();
    cy.getBySel("meetup-sync").should("be.disabled");
    cy.wait("@sync");
    cy.getBySel("meetup-sync").should("be.enabled");
  });

  it("shows the backend's reason when Mazmo fails", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");
    cy.stubApiError(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/sync",
      {
        statusCode: 502,
        detail: "Mazmo did not answer",
      },
    ).as("sync");

    cy.getBySel("meetup-sync").click();
    cy.wait("@sync");
    expectToast("Mazmo did not answer", "error");
    cy.getBySel("meetup-sync").should("be.enabled");
  });
});

describe("Sync by role", () => {
  (["staff", "orgAdmin", "siteAdmin"] as Role[]).forEach((role) => {
    it(`lets ${role} sync`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
      visitMeetup("m-1");
      stubSync();
      cy.getBySel("meetup-sync").click();
      cy.wait("@sync");
      expectToast("Synced: 3 new guests added, 1 skipped");
    });
  });
});

describe("Sync on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
  it("syncs from the stacked toolbar", () => {
    cy.loginAs("staff");
    stubMeetupPage({ meetup: MEETUP, guests: [] });
    visitMeetup("m-1");
    stubSync();
    stubMeetupGuests("m-1", [LUNA]);

    cy.getBySel("meetup-sync").click();
    cy.wait(["@sync", "@guests"]);
    cy.getBySel("guest-cards")
      .findBySel("guest-row-g-luna")
      .should("be.visible");
  });
});
