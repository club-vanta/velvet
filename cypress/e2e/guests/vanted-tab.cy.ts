import { makeGuest } from "../../../src/tests/factories";
import { formatDateTime } from "../../../src/lib/format";
import {
  lastToast,
  shouldListNames,
  stubBannedGuests,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

const ZOE = vanted(makeGuest({ id: "g-zoe", displayname: "Zoe" }), {
  banned_at: "2026-09-01T03:00:00Z",
  banned_reason: "Took photos without consent",
});
const ANA = vanted(makeGuest({ id: "g-ana", displayname: "Ana" }), {
  banned_at: "2026-10-05T03:00:00Z",
  banned_reason: "Aggressive at the door",
});
const NANDU = vanted(
  makeGuest({ id: "g-nandu", displayname: "Ñandú", mazmo_handle: "nandu" }),
  { banned_at: "2026-08-15T03:00:00Z", banned_reason: "Broke the dress code" },
);

function openVantedTab() {
  cy.getBySel("guests-tab-vanted").click();
}

describe("Vanted tab", () => {
  context("as an org admin", () => {
    beforeEach(() => {
      cy.loginAs("orgAdmin");
    });

    it("lists the org's vants by name with when and why", () => {
      stubGuestsPage({ banned: [ZOE, NANDU, ANA] });
      cy.visit("/guests");
      openVantedTab();

      shouldListNames("guests-vanted", ["Ana", "Ñandú", "Zoe"]);
      cy.getBySel("vanted-row-g-zoe").within(() => {
        cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
        cy.getBySel("vanted-at").should(
          "have.text",
          formatDateTime("2026-09-01T03:00:00Z"),
        );
        cy.getBySel("vanted-reason").should(
          "have.text",
          "Took photos without consent",
        );
        cy.getBySel("vanted-unban").should("have.text", "Unvant");
      });
    });

    it("sorts by vant date, newest first", () => {
      stubGuestsPage({ banned: [ZOE, NANDU, ANA] });
      cy.visit("/guests");
      openVantedTab();

      cy.getBySel("list-sort").click();
      cy.getByRole("menuitemradio", { name: "Vant date" }).click();
      cy.getByRole("menuitemradio", { name: "Newest first" }).click();
      cy.press(Cypress.Keyboard.Keys.ESC);

      shouldListNames("guests-vanted", ["Ana", "Zoe", "Ñandú"]);
    });

    it("sorts by reason", () => {
      stubGuestsPage({ banned: [ZOE, NANDU, ANA] });
      cy.visit("/guests");
      openVantedTab();

      cy.getBySel("list-sort").click();
      cy.getByRole("menuitemradio", { name: "Reason" }).click();
      cy.press(Cypress.Keyboard.Keys.ESC);

      shouldListNames("guests-vanted", ["Ana", "Ñandú", "Zoe"]);
    });

    it("searches the vants by name", () => {
      stubGuestsPage({ banned: [ZOE, NANDU, ANA] });
      cy.visit("/guests");
      openVantedTab();

      cy.getBySel("list-search").type("nandu");

      shouldListNames("guests-vanted", ["Ñandú"]);
    });

    it("unvants a guest and drops them from the list", () => {
      stubGuestsPage({ banned: [ZOE, ANA] });
      cy.visit("/guests");
      openVantedTab();
      cy.stubApi("PATCH", "/organizations/{org_id}/guests/{guest_id}/unban", {
        body: makeGuest({ id: "g-zoe", displayname: "Zoe" }),
        params: { guest_id: "g-zoe" },
      }).as("unban");
      stubBannedGuests([ANA]);

      cy.getBySel("vanted-row-g-zoe").findBySel("vanted-unban").click();

      cy.wait("@unban");
      lastToast().should("have.text", "Zoe unvanted");
      cy.getBySel("vanted-row-g-zoe").should("not.exist");
      shouldListNames("guests-vanted", ["Ana"]);
    });

    it("says so when nobody is vanted", () => {
      stubGuestsPage();
      cy.visit("/guests");
      openVantedTab();

      cy.getBySel("guests-vanted")
        .findBySel("guests-empty")
        .should("have.text", "No vanted guests.");
    });

    it("shows an error with a retry that recovers the list", () => {
      stubGuestsPage();
      cy.stubApiError("GET", "/organizations/{org_id}/guests/banned", {
        statusCode: 503,
      });
      cy.visit("/guests");
      openVantedTab();

      cy.getBySel("guests-error-message").should(
        "have.text",
        "Failed to load vanted guests.",
      );
      stubBannedGuests([ZOE]);
      cy.getBySel("guests-error")
        .getByRole("button", { name: "Retry" })
        .click();

      cy.wait("@getBanned");
      cy.getBySel("vanted-row-g-zoe").should("be.visible");
    });

    it("has no accessibility violations", () => {
      stubGuestsPage({ banned: [ZOE, ANA] });
      cy.visit("/guests");
      openVantedTab();
      cy.getBySel("vanted-row-g-zoe").should("be.visible");
      cy.checkA11yAA();
    });
  });

  it("shows staff the vants without the Unvant button", () => {
    cy.loginAs("staff");
    stubGuestsPage({ banned: [ZOE] });
    cy.visit("/guests");
    openVantedTab();

    cy.getBySel("vanted-row-g-zoe")
      .findBySel("vanted-reason")
      .should("have.text", "Took photos without consent");
    cy.getBySel("vanted-unban").should("not.exist");
  });
});
