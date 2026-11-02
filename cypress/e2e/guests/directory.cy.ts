import { makeGuest, makeMazmoProfile } from "../../../src/tests/factories";
import {
  shouldFitWidth,
  shouldListNames,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

const LUNA = makeGuest({
  id: "guest-luna",
  displayname: "Luna",
  mazmo_handle: "luna",
  mazmo_user_id: 1001,
  instagram_username: "luna.ig",
  mazmo_profile: makeMazmoProfile({ pronoun: "FEMALE" }),
});
const MANUAL = makeGuest({
  id: "guest-manual",
  displayname: "Ñandú",
  mazmo_handle: null,
  mazmo_user_id: null,
  mazmo_profile: null,
});
const ROBERTO = makeGuest({
  id: "guest-roberto",
  displayname: "Roberto",
  mazmo_handle: "roberto",
  mazmo_user_id: 1002,
});
const DELETED = makeGuest({
  id: "guest-deleted",
  displayname: "machoarriba",
  mazmo_handle: "machoarriba",
  mazmo_user_id: 1003,
  mazmo_profile: makeMazmoProfile({ mazmo_deleted: true, pronoun: null }),
});

describe("Guest directory", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("lists every guest alphabetically with their identity and links", () => {
    stubGuestsPage({
      guests: [ROBERTO, MANUAL, DELETED, LUNA],
      banned: [vanted(ROBERTO)],
    });
    cy.visit("/guests");
    cy.wait(["@getGuests", "@getBanned"]);

    cy.getByRole("heading", { name: "Guests" }).should("match", "h1");
    // Spanish collation: Ñ sorts after N, case and decoration ignored.
    shouldListNames("guests-directory", [
      "Luna",
      "machoarriba",
      "Ñandú",
      "Roberto",
    ]);
    cy.getBySel("guest-row-guest-luna").within(() => {
      cy.getBySel("guest-name")
        .should("have.text", "Luna")
        .and("have.attr", "href", "/guests/guest-luna");
      cy.getBySel("guest-handle").should("have.text", "@luna");
      cy.getBySel("guest-pronoun").should("have.text", "Pronouns: she/her");
      cy.getBySel("guest-mazmo-id").should("have.text", "1001");
      cy.getByRole("link", { name: "@luna.ig" }).should(
        "have.attr",
        "href",
        "https://instagram.com/luna.ig",
      );
      cy.getBySel("guest-badge-vanted").should("not.exist");
    });
    cy.getBySel("guest-row-guest-manual").within(() => {
      cy.getBySel("guest-handle").should("have.text", "No Mazmo account");
      cy.getBySel("guest-mazmo-id").should("have.text", "—");
      cy.getBySel("guest-instagram").should("have.text", "—");
    });
    cy.getBySel("guest-row-guest-roberto")
      .findBySel("guest-badge-vanted")
      .should("have.text", "Vanted");
    cy.getBySel("guest-row-guest-deleted")
      .findBySel("guest-badge-mazmo-deleted")
      .should("have.text", "Mazmo account deleted");
  });

  it("opens a guest's profile from their name", () => {
    stubGuestsPage({ guests: [LUNA] });
    cy.stubApi("GET", "/guests/{guest_id}", { body: LUNA }).as("getGuest");
    cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
      body: { total: 0, history: [] },
    });
    cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
      body: {
        total: 0,
        summary: {
          attended: 0,
          walkin: 0,
          no_show: 0,
          cancelled: 0,
          upcoming: 0,
        },
        meetups: [],
      },
    });
    cy.visit("/guests");

    cy.getBySel("guest-row-guest-luna").findBySel("guest-name").click();

    cy.location("pathname").should("eq", "/guests/guest-luna");
    cy.wait("@getGuest");
    cy.getBySel("guest-profile-name").should("have.text", "Luna");
  });

  it("shows placeholder rows while the directory loads", () => {
    stubGuestsPage({ guests: [LUNA], delay: 1000 });
    cy.visit("/guests");

    cy.getBySel("guests-loading").should("have.length", 5);
    cy.getBySel("list-search").should("not.exist");
    cy.wait("@getGuests");
    cy.getBySel("guests-loading").should("not.exist");
    cy.getBySel("guest-row-guest-luna").should("be.visible");
  });

  it("says so when there are no guests yet, without a toolbar", () => {
    stubGuestsPage();
    cy.visit("/guests");
    cy.wait("@getGuests");

    cy.getBySel("guests-empty").should("have.text", "No guests yet.");
    cy.getBySel("list-search").should("not.exist");
  });

  it("shows an error with a retry that recovers the list", () => {
    stubGuestsPage();
    cy.stubApiError("GET", "/guests/", { statusCode: 500 }).as("getGuests");
    cy.visit("/guests");

    cy.getBySel("guests-error-message")
      .should("have.text", "Failed to load guests.")
      .then(() => stubGuestsPage({ guests: [LUNA] }));
    // A failed load is not an empty directory.
    cy.getBySel("guests-empty").should("not.exist");
    cy.getBySel("guests-error").getByRole("button", { name: "Retry" }).click();

    cy.wait("@getGuests");
    cy.getBySel("guests-error").should("not.exist");
    cy.getBySel("guest-row-guest-luna").should("be.visible");
  });

  it("has no accessibility violations", () => {
    stubGuestsPage({
      guests: [LUNA, MANUAL, ROBERTO, DELETED],
      banned: [vanted(ROBERTO)],
    });
    cy.visit("/guests");
    cy.getBySel("guest-row-guest-luna").should("be.visible");
    cy.checkA11yAA();
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("stacks each row without scrolling sideways", () => {
      stubGuestsPage({ guests: [LUNA, MANUAL] });
      cy.visit("/guests");

      cy.getBySel("guest-row-guest-luna").should("be.visible");
      shouldFitWidth("guests-page");
      cy.getBySel("guest-row-guest-luna").within(() => {
        cy.getBySel("guest-actions").should("be.visible");
        cy.getBySel("guest-name").should("be.visible");
      });
      // The page only: the Shell's phone header is outside this feature.
      cy.checkA11yAA('[data-cy="guests-page"]');
    });
  });
});
