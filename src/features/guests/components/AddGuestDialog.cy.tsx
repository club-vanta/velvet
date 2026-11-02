import { makeGuest } from "@/tests/factories";
import { AddGuestDialog } from "./AddGuestDialog";

const GUEST = makeGuest({ displayname: "Cindy" });

describe("<AddGuestDialog />", () => {
  beforeEach(() => {
    cy.mount(<AddGuestDialog onClose={cy.spy().as("onClose")} />, {
      as: "staff",
    });
  });

  it("starts on the Mazmo tab, focused on the handle, with Add disabled", () => {
    cy.getByRole("tab", { name: "With Mazmo" }).should(
      "have.attr",
      "aria-selected",
      "true",
    );
    cy.focused().should("have.attr", "data-cy", "add-guest-username");
    cy.getBySel("add-guest-dialog-confirm").should("be.disabled");
    cy.getBySel("add-guest-username").type("   ");
    cy.getBySel("add-guest-dialog-confirm").should("be.disabled");
  });

  it("adds by handle and closes", () => {
    cy.stubApi("POST", "/guests/mazmo", { body: GUEST }).as("add");
    cy.getBySel("add-guest-username").type("cindydark");
    cy.getBySel("add-guest-dialog-confirm").click();

    cy.wait("@add")
      .its("request.body")
      .should("deep.equal", {
        username: "cindydark",
        instagram_username: null,
      });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("needs a name on the Manual tab, and adds by name", () => {
    cy.stubApi("POST", "/guests/manual", { body: GUEST }).as("add");
    cy.getBySel("add-guest-username").type("cindydark");
    cy.getByRole("tab", { name: "Manual" }).click();
    cy.getBySel("add-guest-dialog-confirm").should("be.disabled");
    cy.getBySel("add-guest-displayname").type("Cindy");
    cy.getBySel("add-guest-instagram-manual").type("cindy.ig");
    cy.getBySel("add-guest-dialog-confirm").click();

    cy.wait("@add").its("request.body").should("deep.equal", {
      displayname: "Cindy",
      instagram_username: "cindy.ig",
    });
  });

  it("stays open when adding fails", () => {
    cy.stubApiError("POST", "/guests/mazmo", { statusCode: 409 }).as("add");
    cy.getBySel("add-guest-username").type("cindydark");
    cy.getBySel("add-guest-dialog-confirm").click();

    cy.wait("@add");
    cy.getBySel("add-guest-dialog-confirm").should("be.enabled");
    cy.get("@onClose").should("not.have.been.called");
  });

  it("disables every field while adding", () => {
    cy.stubApi("POST", "/guests/mazmo", { body: GUEST, delay: 800 }).as("add");
    cy.getBySel("add-guest-username").type("cindydark");
    cy.getBySel("add-guest-dialog-confirm").click();

    cy.getBySel("add-guest-dialog-confirm").should("have.text", "Adding…");
    cy.getBySel("add-guest-username").should("be.disabled");
    cy.getBySel("add-guest-instagram-mazmo").should("be.disabled");
    cy.wait("@add");
  });

  it("switches tabs from the keyboard", () => {
    cy.getByRole("tab", { name: "With Mazmo" }).focus();
    cy.press(Cypress.Keyboard.Keys.RIGHT);
    cy.focused().should("have.attr", "data-cy", "add-guest-tab-manual");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("dialog", { native: false }).should(
      "have.css",
      "opacity",
      "1",
    );
    cy.checkA11yAA('[role="dialog"]');
  });
});
