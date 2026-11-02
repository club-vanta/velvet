import { STAFF, stubStaffPage } from "../../support/routes/staff";
import { makeRecoveryCode } from "../../../src/tests/factories";

function openRecoveryDialog() {
  cy.getBySel(`staff-row-${STAFF.active.id}`)
    .findBySel("staff-recovery-code-open")
    .click();
  return cy.getByRole("dialog", {
    name: "Generate recovery code for luz",
    native: false,
  });
}

describe("Recovery codes", () => {
  beforeEach(() => {
    cy.loginAs("siteAdmin");
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);
  });

  it("offers a recovery code on every account, the admin's own included", () => {
    cy.getBySel("staff-recovery-code-open")
      .should("have.length", 4)
      .each(($button) => expect($button).to.have.text("Forgot password"));
  });

  it("generates a code for the account and copies it", () => {
    cy.stubApi("POST", "/staff/{user_id}/recovery-code", {
      body: makeRecoveryCode({ code: "042567" }),
      params: { user_id: String(STAFF.active.id) },
      delay: 300,
    }).as("generate");
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText").as("writeText").resolves();
    });

    openRecoveryDialog().within(() => {
      cy.getBySel("staff-recovery-generate").click();
      cy.getBySel("staff-recovery-generate")
        .should("have.text", "Generating…")
        .and("be.disabled");
    });
    cy.wait("@generate");

    cy.getByRole("dialog", {
      name: "Recovery code for luz:",
      native: false,
    }).within(() => {
      cy.getBySel("staff-recovery-code").should("have.text", "042567");
      cy.clock();
      cy.getBySel("staff-recovery-copy").should("have.text", "Copy").click();
      cy.get("@writeText").should("have.been.calledOnceWith", "042567");
      cy.getBySel("staff-recovery-copy").should("have.text", "Copied!");
      cy.tick(2000);
      cy.getBySel("staff-recovery-copy").should("have.text", "Copy");
      cy.getBySel("staff-recovery-close").click();
    });
    cy.getByRole("dialog", { native: false }).should("not.exist");
  });

  it("explains that a new code replaces the old one, and cancels", () => {
    openRecoveryDialog().within(() => {
      cy.getByRole("heading", { name: "Generate recovery code for luz" });
      cy.contains(
        "This will invalidate any existing code for this user. Continue?",
      ).should("be.visible");
      cy.getByRole("button", { name: "Cancel" }).click();
    });
    cy.getByRole("dialog", { native: false }).should("not.exist");
  });

  it("closes the dialog with an error when the code cannot be generated", () => {
    cy.stubApiError("POST", "/staff/{user_id}/recovery-code", {
      statusCode: 403,
      detail: "Forbidden",
    }).as("generate");

    openRecoveryDialog().within(() => {
      cy.getBySel("staff-recovery-generate").click();
    });

    cy.wait("@generate");
    cy.contains(
      "[data-sonner-toast]",
      "Failed to generate recovery code",
    ).should("have.attr", "data-type", "error");
    cy.getByRole("dialog", { native: false }).should("not.exist");
  });

  it("shows the same error when the network fails", () => {
    cy.stubApiError("POST", "/staff/{user_id}/recovery-code", {
      statusCode: 0,
      forceNetworkError: true,
    }).as("generate");

    openRecoveryDialog().within(() => {
      cy.getBySel("staff-recovery-generate").click();
    });

    cy.wait("@generate");
    cy.contains(
      "[data-sonner-toast]",
      "Failed to generate recovery code",
    ).should("be.visible");
    cy.getByRole("dialog", { native: false }).should("not.exist");
  });

  it("has no accessibility violations in either dialog step", () => {
    cy.stubApi("POST", "/staff/{user_id}/recovery-code", {
      body: makeRecoveryCode(),
    }).as("generate");

    openRecoveryDialog().should("be.visible");
    cy.checkA11yAA();
    cy.getBySel("staff-recovery-generate").click();
    cy.wait("@generate");
    cy.getBySel("staff-recovery-code").should("be.visible");
    cy.checkA11yAA();
  });
});
