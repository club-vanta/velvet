import {
  makeGuest,
  makeNameHistory,
  makeNameHistoryEntry,
} from "../../../src/tests/factories";
import {
  lastToast,
  shouldListNames,
  stubGuestProfile,
  stubGuestsPage,
  shouldBeSettled,
} from "../../support/routes/guests";

const LUNA = makeGuest({
  id: "guest-luna",
  displayname: "Luna",
  instagram_username: "luna.ig",
});

function dialog() {
  return cy.getByRole("dialog", { name: "Edit guest", native: false });
}

function saveButton() {
  return cy.getBySel("edit-guest-dialog-confirm");
}

function stubEdit() {
  cy.stubApi("PATCH", "/guests/{guest_id}", {
    body: LUNA,
    params: { guest_id: "guest-luna" },
  }).as("edit");
}

describe("Editing a guest", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  context("from the directory", () => {
    beforeEach(() => {
      stubGuestsPage({ guests: [LUNA] });
      cy.visit("/guests");
      cy.getBySel("guest-row-guest-luna").findBySel("guest-actions").click();
      cy.getBySel("guest-action-edit").click();
    });

    it("starts from the guest's current name and Instagram", () => {
      dialog().should("be.visible");
      cy.getBySel("edit-guest-displayname").should("have.value", "Luna");
      cy.getBySel("edit-guest-instagram").should("have.value", "luna.ig");
    });

    it("sends only the new name, trimmed, and shows it in the directory", () => {
      stubEdit();
      stubGuestsPage({ guests: [{ ...LUNA, displayname: "Luna Roja" }] });

      cy.getBySel("edit-guest-displayname").clear();
      cy.getBySel("edit-guest-displayname").type("  Luna Roja ");
      saveButton().click();

      cy.wait("@edit")
        .its("request.body")
        .should("deep.equal", { displayname: "Luna Roja" });
      dialog().should("not.exist");
      lastToast().should("have.text", "Guest updated");
      cy.wait("@getGuests");
      shouldListNames("guests-directory", ["Luna Roja"]);
    });

    it("sends an explicit null when the Instagram handle is cleared", () => {
      stubEdit();

      cy.getBySel("edit-guest-instagram").clear();
      saveButton().click();

      cy.wait("@edit")
        .its("request.body")
        .should("deep.equal", { instagram_username: null });
    });

    it("sends a changed Instagram handle on its own", () => {
      stubEdit();

      cy.getBySel("edit-guest-instagram").clear();
      cy.getBySel("edit-guest-instagram").type("luna.roja");
      saveButton().click();

      cy.wait("@edit")
        .its("request.body")
        .should("deep.equal", { instagram_username: "luna.roja" });
    });

    it("can't save a blank name", () => {
      cy.getBySel("edit-guest-displayname").clear();
      cy.getBySel("edit-guest-displayname").type("   ");

      saveButton().should("be.disabled");
    });

    it("shows the backend's error and keeps the dialog open", () => {
      cy.stubApiError("PATCH", "/guests/{guest_id}", {
        statusCode: 422,
        detail: "Instagram username is too long",
      }).as("edit");

      cy.getBySel("edit-guest-instagram").type("x");
      saveButton().click();

      cy.wait("@edit");
      lastToast().should("have.text", "Instagram username is too long");
      dialog().should("be.visible");
    });

    it("disables the form while saving", () => {
      cy.stubApi("PATCH", "/guests/{guest_id}", { body: LUNA, delay: 1000 }).as(
        "edit",
      );

      cy.getBySel("edit-guest-instagram").type("x");
      saveButton().click();

      saveButton().should("be.disabled").and("have.text", "Saving…");
      cy.getBySel("edit-guest-displayname").should("be.disabled");
      cy.wait("@edit");
      dialog().should("not.exist");
    });

    it("has no accessibility violations", () => {
      dialog().should("be.visible");
      shouldBeSettled("dialog");
      cy.checkA11yAA('[role="dialog"]');
    });
  });

  it("refreshes the profile and its name history after a rename", () => {
    stubGuestProfile(LUNA);
    cy.visit("/guests/guest-luna");
    cy.wait(["@getGuest", "@getHistory"]);
    stubEdit();
    stubGuestProfile(
      { ...LUNA, displayname: "Luna Roja" },
      {
        history: makeNameHistory([
          makeNameHistoryEntry({
            displayname: "Luna Roja",
            source: "MANUAL_EDIT",
            actor: { id: 1, username: "door" },
          }),
          makeNameHistoryEntry({ displayname: "Luna" }),
        ]),
      },
    );

    cy.getBySel("guest-profile-edit").click();
    cy.getBySel("edit-guest-displayname").clear();
    cy.getBySel("edit-guest-displayname").type("Luna Roja");
    saveButton().click();

    cy.wait(["@edit", "@getGuest", "@getHistory"]);
    cy.getBySel("guest-profile-name").should("have.text", "Luna Roja");
    cy.getBySel("history-item").should("have.length", 2);
    cy.getBySel("history-item")
      .first()
      .findBySel("history-name")
      .should("have.text", "Luna Roja");
  });
});
