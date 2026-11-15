import { makeGuest, makeUser, type Role } from "../../../src/tests/factories";
import {
  stubGuestProfile,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

// What each role can do with a guest. Staff work the door: they add, edit
// and link guests. Vanting is for org admins and site admins.
const LINKED = makeGuest({ id: "g-linked", displayname: "Linked" });
const MANUAL = makeGuest({
  id: "g-manual",
  displayname: "Manual",
  mazmo_handle: null,
  mazmo_user_id: null,
  mazmo_profile: null,
});
const VANTED = makeGuest({ id: "g-vanted", displayname: "Vanted One" });

function menuItems(guestId: string) {
  cy.getBySel(`guest-row-${guestId}`).findBySel("guest-actions").click();
  return cy.getByRole("menu").getByRole("menuitem");
}

function shouldOffer(guestId: string, items: string[]) {
  menuItems(guestId).should(($items) => {
    const names = $items.toArray().map((el) => {
      const label = el.getAttribute("aria-labelledby");
      return label
        ? el.ownerDocument.getElementById(label)?.textContent
        : el.textContent;
    });
    expect(names).to.deep.equal(items);
  });
  cy.press(Cypress.Keyboard.Keys.ESC);
}

describe("What each role can do with guests", () => {
  context("staff", () => {
    beforeEach(() => {
      cy.loginAs("staff");
    });

    it("can view, edit and link, but never vant or unvant, in the directory", () => {
      stubGuestsPage({
        guests: [LINKED, MANUAL, VANTED],
        banned: [vanted(VANTED)],
      });
      cy.visit("/guests");
      cy.wait("@getBanned");

      cy.getBySel("guests-add").should("be.visible");
      cy.getBySel("guests-refresh-mazmo").should("be.visible");
      shouldOffer("g-linked", ["View profile", "Edit", "Unlink Mazmo account"]);
      shouldOffer("g-manual", ["View profile", "Edit", "Link Mazmo account"]);
      shouldOffer("g-vanted", ["View profile", "Edit", "Unlink Mazmo account"]);
    });

    it("can edit and link on a profile, but never vant or unvant", () => {
      stubGuestProfile(VANTED, { banned: [vanted(VANTED)] });
      cy.visit("/guests/g-vanted");
      cy.wait("@getBanned");

      cy.getBySel("guest-profile-edit").should("be.visible");
      cy.getBySel("guest-profile-unlink").should("exist");
      cy.getBySel("guest-profile-ban").should("not.exist");
      cy.getBySel("guest-profile-unban").should("not.exist");
      cy.getBySel("guest-vant-alert").should("be.visible");
    });

    it("sees the Vanted tab without Unvant", () => {
      stubGuestsPage({ banned: [vanted(VANTED)] });
      cy.visit("/guests");
      cy.getBySel("guests-tab-vanted").click();

      cy.getBySel("vanted-row-g-vanted").should("be.visible");
      cy.getBySel("vanted-unban").should("not.exist");
    });

    it("is told there is no organization when they belong to none", () => {
      cy.loginAs("staff", { user: makeUser({ org_memberships: [] }) });
      cy.visit("/guests");

      cy.getBySel("guests-no-org").should(
        "have.text",
        "No organization assigned. Contact an administrator.",
      );
      cy.getBySel("guests-add").should("not.exist");
    });
  });

  const admins: Role[] = ["orgAdmin", "siteAdmin"];
  admins.forEach((role) => {
    context(role, () => {
      beforeEach(() => {
        cy.loginAs(role);
      });

      it("can also vant a guest and unvant a vanted one in the directory", () => {
        stubGuestsPage({ guests: [LINKED, VANTED], banned: [vanted(VANTED)] });
        cy.visit("/guests");
        cy.wait("@getBanned");

        shouldOffer("g-linked", [
          "View profile",
          "Edit",
          "Unlink Mazmo account",
          "Vant",
        ]);
        shouldOffer("g-vanted", [
          "View profile",
          "Edit",
          "Unlink Mazmo account",
          "Unvant",
        ]);
      });

      it("can vant from a profile", () => {
        stubGuestProfile(LINKED);
        cy.visit("/guests/g-linked");
        cy.wait("@getBanned");

        cy.getBySel("guest-profile-ban").should("have.text", "Vant");
        cy.getBySel("guest-profile-unban").should("not.exist");
      });

      it("can unvant from a profile and from the Vanted tab", () => {
        stubGuestProfile(VANTED, { banned: [vanted(VANTED)] });
        cy.visit("/guests/g-vanted");
        cy.wait("@getBanned");

        cy.getBySel("guest-profile-unban").should("have.text", "Unvant");
        cy.getBySel("guest-profile-ban").should("not.exist");
        stubGuestsPage({ banned: [vanted(VANTED)] });
        cy.getBySel("guest-back").click();
        cy.getBySel("guests-tab-vanted").click();
        cy.getBySel("vanted-row-g-vanted")
          .findBySel("vanted-unban")
          .should("be.visible");
      });

      it("waits for the vant status before offering Vant in the directory", () => {
        stubGuestsPage({ guests: [LINKED] });
        cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
          body: { total: 0, guests: [] },
          delay: 1500,
        }).as("getBanned");
        cy.visit("/guests");
        cy.wait("@getGuests");

        shouldOffer("g-linked", [
          "View profile",
          "Edit",
          "Unlink Mazmo account",
        ]);
        cy.wait("@getBanned");
        shouldOffer("g-linked", [
          "View profile",
          "Edit",
          "Unlink Mazmo account",
          "Vant",
        ]);
      });
    });
  });

  it("has no accessibility violations on an admin's profile", () => {
    cy.loginAs("orgAdmin");
    stubGuestProfile(LINKED);
    cy.visit("/guests/g-linked");
    cy.getBySel("guest-profile-ban").should("be.visible");
    cy.checkA11yAA();
  });
});
