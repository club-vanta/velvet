import { makeUser } from "../../../src/tests/factories";
import { expectFieldHint, visitSignedOut } from "../../support/routes/auth";

const PASSWORD = "fifteen-chars-ok";

describe("Signup", () => {
  beforeEach(() => {
    visitSignedOut("/signup");
  });

  it("creates an account and goes back to login", () => {
    cy.stubApi("POST", "/auth/register", {
      body: makeUser({ username: "luna", org_memberships: [] }),
      statusCode: 201,
    }).as("register");

    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type(PASSWORD);
    cy.getBySel("signup-submit").click();

    cy.wait("@register")
      .its("request.body")
      .should("deep.equal", { username: "luna", password: PASSWORD });
    cy.getBySel("signup-success").should(
      "have.text",
      "You've registered successfully! You can now log in with your credentials.",
    );
    cy.getBySel("signup-username").should("not.exist");
    cy.getBySel("signup-login-link").should("not.exist");
    cy.getBySel("signup-back-to-login")
      .should("have.text", "Back to login")
      .click();
    cy.location("pathname").should("eq", "/");
    cy.getBySel("login-username").should("be.visible");
  });

  it("requires a username and a password of at least 15 characters", () => {
    // No register stub: a request would fail the test.
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-username").should("match", ":invalid");

    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type("a".repeat(14));
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-password")
      .should("match", ":invalid")
      .and("have.prop", "validationMessage", "Minimum 15 characters.")
      .and("have.attr", "minlength", "15");
    expectFieldHint("signup-password", "Minimum 15 characters.");
    cy.location("pathname").should("eq", "/signup");
  });

  it("explains that the username is taken", () => {
    cy.stubApiError("POST", "/auth/register", {
      statusCode: 409,
      detail: "Username 'luna' is already taken.",
    });

    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type(PASSWORD);
    cy.getBySel("signup-submit").click();

    cy.getBySel("signup-error").should(
      "have.text",
      "Username is already taken.",
    );
    cy.getBySel("signup-submit").should("be.enabled");
  });

  it("shows a generic error when the server fails", () => {
    cy.stubApiError("POST", "/auth/register", { statusCode: 500 });

    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type(PASSWORD);
    cy.getBySel("signup-submit").click();

    cy.getBySel("signup-error").should(
      "have.text",
      "Something went wrong. Please try again.",
    );
  });

  it("explains a network error in the UI language", () => {
    cy.stubApiError("POST", "/auth/register", {
      statusCode: 0,
      forceNetworkError: true,
    });

    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type(PASSWORD);
    cy.getBySel("signup-submit").click();

    cy.getBySel("signup-error").should(
      "have.text",
      "Could not reach the server.\nCheck your connection.",
    );
  });

  it("disables the form while signing up", () => {
    cy.stubApi("POST", "/auth/register", {
      body: makeUser({ username: "luna" }),
      statusCode: 201,
      delay: 1000,
    }).as("register");

    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type(PASSWORD);
    cy.getBySel("signup-submit").click();

    cy.getBySel("signup-submit")
      .should("be.disabled")
      .and("have.text", "Signing up…");
    cy.getBySel("signup-username").should("be.disabled");
    cy.wait("@register");
    cy.getBySel("signup-success").should("be.visible");
  });

  it("links back to login", () => {
    cy.getBySel("signup-login-link").should("have.text", "Sign in").click();
    cy.location("pathname").should("eq", "/");
  });

  it("has no accessibility violations", () => {
    cy.getBySel("auth-subtitle").should("have.text", "Create account");
    cy.checkA11yAA();
  });
});
