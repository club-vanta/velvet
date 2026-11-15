import { expectFieldLabel, visitSignedOut } from "../../support/routes/auth";

function submitCode(code = "123456") {
  cy.getBySel("forgot-username").type("alice");
  cy.getBySel("forgot-code").type(code);
  cy.getBySel("forgot-submit").click();
}

describe("Forgot password", () => {
  beforeEach(() => {
    visitSignedOut("/forgot-password");
  });

  it("verifies the recovery code and sets a new password", () => {
    cy.stubApi("POST", "/auth/verify-recovery-code", { body: {} }).as(
      "verifyCode",
    );
    cy.stubApi("POST", "/auth/reset-password", {
      body: { username: "alice" },
    }).as("resetPassword");

    submitCode();
    cy.wait("@verifyCode")
      .its("request.body")
      .should("deep.equal", { username: "alice", code: "123456" });
    cy.location("pathname").should("eq", "/reset-password");

    cy.getBySel("reset-password").type("my-new-long-password");
    cy.getBySel("reset-submit").click();
    cy.wait("@resetPassword").its("request.body").should("deep.equal", {
      username: "alice",
      code: "123456",
      new_password: "my-new-long-password",
    });
    cy.getBySel("reset-success").should(
      "have.text",
      "Congratulations alice, you've successfully changed your password!",
    );
    cy.getBySel("reset-back-to-login").click();
    cy.location("pathname").should("eq", "/");
    cy.getBySel("login-username").should("be.visible");
  });

  it("shows the backend's message for an invalid code", () => {
    cy.stubApiError("POST", "/auth/verify-recovery-code", {
      statusCode: 400,
      detail: "Código inválido o expirado.",
    });

    submitCode("000000");

    cy.getBySel("forgot-error").should(
      "have.text",
      "Código inválido o expirado.",
    );
    cy.location("pathname").should("eq", "/forgot-password");
    cy.getBySel("forgot-submit").should("be.enabled");
  });

  it("clears the error on the next attempt", () => {
    cy.stubApiError("POST", "/auth/verify-recovery-code", {
      statusCode: 400,
      detail: "Código inválido o expirado.",
    });
    submitCode("000000");
    cy.getBySel("forgot-error").should("be.visible");

    cy.stubApi("POST", "/auth/verify-recovery-code", {
      body: {},
      delay: 500,
    });
    cy.getBySel("forgot-submit").click();
    cy.getBySel("forgot-error").should("not.exist");
    cy.location("pathname").should("eq", "/reset-password");
  });

  it("explains a network error in the UI language", () => {
    cy.stubApiError("POST", "/auth/verify-recovery-code", {
      statusCode: 0,
      forceNetworkError: true,
    });

    submitCode();

    cy.getBySel("forgot-error").should(
      "have.text",
      "Could not reach the server.\nCheck your connection.",
    );
  });

  it("disables the form while verifying", () => {
    cy.stubApi("POST", "/auth/verify-recovery-code", {
      body: {},
      delay: 1000,
    }).as("verifyCode");

    submitCode();

    cy.getBySel("forgot-submit")
      .should("be.disabled")
      .and("have.text", "Verifying…");
    cy.getBySel("forgot-code").should("be.disabled");
    cy.wait("@verifyCode");
  });

  it("asks for a six-digit numeric code", () => {
    cy.getBySel("forgot-code")
      .should("have.attr", "inputmode", "numeric")
      .and("have.attr", "maxlength", "6");
    cy.getBySel("forgot-code").type("12345678");
    cy.getBySel("forgot-code").should("have.value", "123456");
    expectFieldLabel("forgot-code", "Recovery code");
    expectFieldLabel("forgot-username", "Username");
  });

  it("links back to login", () => {
    cy.getBySel("forgot-back-to-login")
      .should("have.text", "Back to login")
      .click();
    cy.location("pathname").should("eq", "/");
  });

  it("has no accessibility violations", () => {
    cy.getBySel("auth-subtitle").should("have.text", "Recover your account");
    cy.checkA11yAA();
  });
});
