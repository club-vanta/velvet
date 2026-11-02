import { makeGuest } from "../../../src/tests/factories";
import {
  lastToast,
  shouldListNames,
  stubGuestsPage,
  shouldBeSettled,
} from "../../support/routes/guests";

const EXISTING = makeGuest({ id: "g-ana", displayname: "Ana" });
const CINDY = makeGuest({
  id: "g-cindy",
  displayname: "Cindy",
  mazmo_handle: "cindydark",
  instagram_username: "cindy.ig",
});
const MANUAL = makeGuest({
  id: "g-manual",
  displayname: "No Mazmo Guy",
  mazmo_handle: null,
  mazmo_user_id: null,
  mazmo_profile: null,
});

function dialog() {
  return cy.getByRole("dialog", { name: "Add new guest", native: false });
}

function addButton() {
  return cy.getBySel("add-guest-dialog-confirm");
}

function openDialog() {
  cy.getBySel("guests-add").click();
  dialog().should("be.visible");
}

describe("Adding a guest", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubGuestsPage({ guests: [EXISTING] });
    cy.visit("/guests");
    cy.wait("@getGuests");
  });

  context("by Mazmo handle", () => {
    beforeEach(() => {
      openDialog();
    });

    it("adds the guest, trimmed, and shows them in the directory", () => {
      cy.stubApi("POST", "/guests/mazmo", { body: CINDY }).as("addMazmo");
      cy.focused().should("have.attr", "data-cy", "add-guest-username");
      addButton().should("be.disabled");

      cy.getBySel("add-guest-username").type("  cindydark ");
      cy.getBySel("add-guest-instagram-mazmo").type(" cindy.ig ");
      stubGuestsPage({ guests: [EXISTING, CINDY] });
      addButton().click();

      cy.wait("@addMazmo").its("request.body").should("deep.equal", {
        username: "cindydark",
        instagram_username: "cindy.ig",
      });
      dialog().should("not.exist");
      lastToast().should("have.text", "Cindy added successfully");
      cy.wait("@getGuests");
      shouldListNames("guests-directory", ["Ana", "Cindy"]);
    });

    it("sends no Instagram handle when it is left blank", () => {
      cy.stubApi("POST", "/guests/mazmo", { body: CINDY }).as("addMazmo");

      cy.getBySel("add-guest-username").type("cindydark");
      cy.getBySel("add-guest-instagram-mazmo").type("   ");
      addButton().click();

      cy.wait("@addMazmo").its("request.body").should("deep.equal", {
        username: "cindydark",
        instagram_username: null,
      });
    });

    const errors: [number, string][] = [
      [404, "Mazmo user not found. Check the handle."],
      [409, "This guest is already registered in the system."],
      [504, "Could not connect to Mazmo. Try again."],
    ];
    errors.forEach(([statusCode, message]) => {
      it(`explains a ${statusCode} and keeps the dialog open`, () => {
        cy.stubApiError("POST", "/guests/mazmo", {
          statusCode,
          detail: "raw backend detail",
        }).as("addMazmo");

        cy.getBySel("add-guest-username").type("cindydark");
        addButton().click();

        cy.wait("@addMazmo");
        lastToast().should("have.text", message);
        dialog().should("be.visible");
        cy.getBySel("add-guest-username").should("have.value", "cindydark");
      });
    });

    it("shows the backend's detail for other errors", () => {
      cy.stubApiError("POST", "/guests/mazmo", {
        statusCode: 500,
        detail: "Mazmo returned an unexpected payload",
      }).as("addMazmo");

      cy.getBySel("add-guest-username").type("cindydark");
      addButton().click();

      lastToast().should("have.text", "Mazmo returned an unexpected payload");
    });

    it("disables the form while the guest is being added", () => {
      cy.stubApi("POST", "/guests/mazmo", { body: CINDY, delay: 1000 }).as(
        "addMazmo",
      );

      cy.getBySel("add-guest-username").type("cindydark");
      addButton().click();

      addButton().should("be.disabled").and("have.text", "Adding…");
      cy.getBySel("add-guest-username").should("be.disabled");
      cy.wait("@addMazmo");
      dialog().should("not.exist");
    });

    it("closes on Cancel without adding anyone", () => {
      cy.stubApiError("POST", "/guests/mazmo", { statusCode: 500 }).as(
        "addMazmo",
      );

      cy.getBySel("add-guest-username").type("cindydark");
      cy.getByRole("button", { name: "Cancel" }).click();

      dialog().should("not.exist");
      cy.get("@addMazmo.all").should("have.length", 0);
    });

    it("has no accessibility violations", () => {
      shouldBeSettled("dialog");
      cy.checkA11yAA('[role="dialog"]');
    });
  });

  context("without Mazmo", () => {
    beforeEach(() => {
      openDialog();
      cy.getByRole("tab", { name: "Manual" }).click();
    });

    it("adds the guest by name and shows them in the directory", () => {
      cy.stubApi("POST", "/guests/manual", { body: MANUAL }).as("addManual");
      addButton().should("be.disabled");

      cy.getBySel("add-guest-displayname").type(" No Mazmo Guy ");
      stubGuestsPage({ guests: [EXISTING, MANUAL] });
      addButton().click();

      cy.wait("@addManual").its("request.body").should("deep.equal", {
        displayname: "No Mazmo Guy",
        instagram_username: null,
      });
      lastToast().should("have.text", "No Mazmo Guy added successfully");
      cy.wait("@getGuests");
      cy.getBySel("guest-row-g-manual")
        .findBySel("guest-handle")
        .should("have.text", "No Mazmo account");
    });

    it("keeps the Instagram handle typed on the Mazmo tab", () => {
      cy.stubApi("POST", "/guests/manual", { body: MANUAL }).as("addManual");
      cy.getByRole("tab", { name: "With Mazmo" }).click();
      cy.getBySel("add-guest-instagram-mazmo").type("guy.ig");
      cy.getByRole("tab", { name: "Manual" }).click();

      cy.getBySel("add-guest-instagram-manual").should("have.value", "guy.ig");
      cy.getBySel("add-guest-displayname").type("No Mazmo Guy");
      addButton().click();

      cy.wait("@addManual").its("request.body").should("deep.equal", {
        displayname: "No Mazmo Guy",
        instagram_username: "guy.ig",
      });
    });

    it("shows the backend's validation message", () => {
      cy.stubApiError("POST", "/guests/manual", {
        statusCode: 409,
        detail: "Display name is too long",
      }).as("addManual");

      cy.getBySel("add-guest-displayname").type("No Mazmo Guy");
      addButton().click();

      cy.wait("@addManual");
      lastToast().should("have.text", "Display name is too long");
      dialog().should("be.visible");
    });

    it("has no accessibility violations", () => {
      cy.getBySel("add-guest-displayname").should("be.visible");
      shouldBeSettled("dialog");
      cy.checkA11yAA('[role="dialog"]');
    });
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("adds a guest by Mazmo handle at the door", () => {
      cy.stubApi("POST", "/guests/mazmo", { body: CINDY }).as("addMazmo");
      openDialog();
      shouldFitDialog();

      cy.getBySel("add-guest-username").type("cindydark");
      addButton().click();

      cy.wait("@addMazmo");
      dialog().should("not.exist");
      lastToast().should("have.text", "Cindy added successfully");
    });
  });
});

function shouldFitDialog() {
  dialog().should(($dialog) => {
    const { left, right } = $dialog[0].getBoundingClientRect();
    expect(left).to.be.at.least(0);
    expect(right).to.be.at.most(375);
  });
}
