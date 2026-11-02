import {
  expectFieldHint,
  expectFieldLabel,
  openResetPassword,
  visitSignedOut,
} from "../../support/routes/auth";

describe("Reset password", () => {
  it("sends a direct visit back to login", () => {
    // The verified code travels in the router state, which a typed URL or
    // a reload does not have.
    visitSignedOut("/reset-password");
    cy.location("pathname").should("eq", "/");
    cy.getBySel("login-username").should("be.visible");
  });

  context("after verifying a code", () => {
    beforeEach(() => {
      openResetPassword();
    });

    it("requires a password of at least 15 characters", () => {
      // No reset stub: a request would fail the test.
      cy.getBySel("reset-password").type("a".repeat(14));
      cy.getBySel("reset-submit").click();
      cy.getBySel("reset-password")
        .should("match", ":invalid")
        .and("have.prop", "validationMessage", "Minimum 15 characters.");
      expectFieldLabel("reset-password", "New password");
      expectFieldHint("reset-password", "Minimum 15 characters.");
    });

    it("shows the backend's message when the reset fails", () => {
      cy.stubApiError("POST", "/auth/reset-password", {
        statusCode: 400,
        detail: "Código inválido o expirado.",
      });

      cy.getBySel("reset-password").type("my-new-long-password");
      cy.getBySel("reset-submit").click();

      cy.getBySel("reset-error").should(
        "have.text",
        "Código inválido o expirado.",
      );
      cy.getBySel("reset-success").should("not.exist");
    });

    it("explains a network error in the UI language", () => {
      cy.stubApiError("POST", "/auth/reset-password", {
        statusCode: 0,
        forceNetworkError: true,
      });

      cy.getBySel("reset-password").type("my-new-long-password");
      cy.getBySel("reset-submit").click();

      cy.getBySel("reset-error").should(
        "have.text",
        "Could not reach the server.\nCheck your connection.",
      );
    });

    it("disables the form while saving", () => {
      cy.stubApi("POST", "/auth/reset-password", {
        body: { username: "alice" },
        delay: 1000,
      }).as("resetPassword");

      cy.getBySel("reset-password").type("my-new-long-password");
      cy.getBySel("reset-submit").click();

      cy.getBySel("reset-submit")
        .should("be.disabled")
        .and("have.text", "Saving…");
      cy.getBySel("reset-password").should("be.disabled");
      cy.wait("@resetPassword");
      cy.getBySel("reset-success").should("be.visible");
    });

    it("has no accessibility violations", () => {
      cy.getBySel("reset-password").should("have.attr", "type", "password");
      cy.checkA11yAA();
    });
  });
});
