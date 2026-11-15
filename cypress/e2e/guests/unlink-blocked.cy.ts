import { makeGuest } from "../../../src/tests/factories";
import {
  shouldBeDescribedBy,
  stubGuestProfile,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

// The backend refuses to unlink a vanted guest (409), so the app must not
// offer it, and must say why, until it knows the guest is not vanted.
const LUNA = makeGuest({ id: "guest-luna", displayname: "Luna" });
const VANTED_HINT = "A vanted guest can't be unlinked from Mazmo.";
const UNKNOWN_HINT = "Can't unlink until the vant status has loaded.";

describe("Unlinking Mazmo needs the vant status", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  context("in the directory", () => {
    function openMenu() {
      cy.getBySel("guest-row-guest-luna").findBySel("guest-actions").click();
    }

    it("disables Unlink for a vanted guest and says why", () => {
      stubGuestsPage({ guests: [LUNA], banned: [vanted(LUNA)] });
      cy.visit("/guests");
      cy.wait("@getBanned");
      openMenu();

      cy.getByRole("menuitem", { name: "Unlink Mazmo account" }).should(
        "have.attr",
        "aria-disabled",
        "true",
      );
      cy.getBySel("guest-action-unlink-hint").should("have.text", VANTED_HINT);
      shouldBeDescribedBy("guest-action-unlink", VANTED_HINT);
    });

    it("keeps Unlink disabled until the vant status loads", () => {
      stubGuestsPage({ guests: [LUNA] });
      cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
        body: { total: 0, guests: [] },
        delay: 1500,
      }).as("getBanned");
      cy.visit("/guests");
      cy.wait("@getGuests");
      openMenu();

      cy.getBySel("guest-action-unlink").should(
        "have.attr",
        "aria-disabled",
        "true",
      );
      shouldBeDescribedBy("guest-action-unlink", UNKNOWN_HINT);
      cy.wait("@getBanned");
      cy.getBySel("guest-action-unlink").should(($item) => {
        expect($item).not.to.have.attr("aria-disabled");
        expect($item).not.to.have.attr("aria-describedby");
      });
      cy.getBySel("guest-action-unlink-hint").should("not.exist");
    });
  });

  context("on the profile", () => {
    it("disables Unlink for a vanted guest with a visible reason", () => {
      stubGuestProfile(LUNA, { banned: [vanted(LUNA)] });
      cy.visit("/guests/guest-luna");
      cy.wait("@getBanned");

      cy.getBySel("guest-profile-unlink")
        .should("be.disabled")
        .and("not.have.attr", "title");
      cy.getBySel("guest-profile-unlink-hint")
        .should("be.visible")
        .and("have.text", VANTED_HINT);
      shouldBeDescribedBy("guest-profile-unlink", VANTED_HINT);
    });

    it("disables Unlink when the vant status could not be checked", () => {
      stubGuestProfile(LUNA);
      cy.stubApiError("GET", "/organizations/{org_id}/guests/banned", {
        statusCode: 500,
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-vant-status-error").should("be.visible");
      cy.getBySel("guest-profile-unlink").should("be.disabled");
      shouldBeDescribedBy("guest-profile-unlink", UNKNOWN_HINT);
    });

    it("enables Unlink once the guest is known not to be vanted", () => {
      stubGuestProfile(LUNA);
      cy.visit("/guests/guest-luna");
      cy.wait("@getBanned");

      cy.getBySel("guest-profile-unlink").should(($button) => {
        expect($button.prop("disabled")).to.equal(false);
        expect($button).not.to.have.attr("aria-describedby");
      });
      cy.getBySel("guest-profile-unlink-hint").should("not.exist");
    });
  });
});
