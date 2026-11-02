import { USERS } from "../../../src/tests/factories";
import { stubDashboardPage } from "../../support/routes/app";
import { visitSignedOut } from "../../support/routes/auth";

function fillCredentials(password = "a-very-long-password") {
  cy.getBySel("login-username").type("door");
  cy.getBySel("login-password").type(password);
}

describe("Login", () => {
  beforeEach(() => {
    visitSignedOut("/");
  });

  it("signs in and lands on the dashboard", () => {
    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-door", token_type: "bearer" },
    }).as("token");
    stubDashboardPage();

    fillCredentials();
    // The session request after the token must return the user now.
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.staff }).as("userinfo");
    cy.getBySel("login-submit").click();

    cy.wait("@token")
      .its("request.body")
      .should("include", "username=door")
      .and("include", "password=a-very-long-password");
    cy.wait("@userinfo")
      .its("request.headers.authorization")
      .should("eq", "Bearer token-door");
    cy.location("pathname").should("eq", "/dashboard");
    cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
    cy.getBySel("shell-username").should("have.text", "door");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "auth_token")
      .should("eq", "token-door");
  });

  it("signs in with the keyboard alone", () => {
    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-door", token_type: "bearer" },
    }).as("token");
    stubDashboardPage();
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.staff });
    // The username is the first field; start there and tab through the rest.
    cy.getBySel("login-username").focus();
    cy.focused().should("have.attr", "data-cy", "login-username").type("door");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused()
      .should("have.attr", "data-cy", "login-password")
      .type("a-very-long-password");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "password-visibility");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "login-submit").type("{enter}");

    cy.wait("@token");
    cy.location("pathname").should("eq", "/dashboard");
  });

  it("disables the form while signing in", () => {
    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-door", token_type: "bearer" },
      delay: 1000,
    }).as("token");
    stubDashboardPage();
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.staff });

    fillCredentials();
    cy.getBySel("login-submit").click();

    cy.getBySel("login-submit")
      .should("be.disabled")
      .and("have.text", "Signing in…");
    cy.getBySel("login-username").should("be.disabled");
    cy.getBySel("login-password").should("be.disabled");
    cy.wait("@token");
    cy.location("pathname").should("eq", "/dashboard");
  });

  it("shows the backend's error when the credentials are wrong", () => {
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 401,
      detail: "Incorrect username or password.",
    });

    fillCredentials("wrong-password-123");
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should(
      "have.text",
      "Incorrect username or password.",
    );
    cy.getBySel("login-submit")
      .should("be.enabled")
      .and("have.text", "Sign in");
    cy.location("pathname").should("eq", "/");
  });

  it("tells an account pending approval to wait", () => {
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 403,
      detail: "Your account is pending admin approval. Please try again later.",
    });

    fillCredentials();
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should(
      "have.text",
      "Your account is pending admin approval. Please try again later.",
    );
    cy.location("pathname").should("eq", "/");
  });

  it("tells a disabled account it cannot sign in", () => {
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 403,
      detail: "Your account has been disabled.",
    });

    fillCredentials();
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should(
      "have.text",
      "Your account has been disabled.",
    );
    cy.location("pathname").should("eq", "/");
  });

  it("explains a network error in the UI language", () => {
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 0,
      forceNetworkError: true,
    });

    fillCredentials();
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should(
      "have.text",
      "Could not reach the server.\nCheck your connection.",
    );
  });

  it("clears the previous error on the next attempt", () => {
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 401,
      detail: "Incorrect username or password.",
    });
    fillCredentials("wrong-password-123");
    cy.getBySel("login-submit").click();
    cy.getBySel("login-error").should("be.visible");

    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-door", token_type: "bearer" },
      delay: 500,
    });
    stubDashboardPage();
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.staff });
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should("not.exist");
    cy.location("pathname").should("eq", "/dashboard");
  });

  it("drops the token when the profile fails to load after it", () => {
    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-door", token_type: "bearer" },
    }).as("token");
    cy.stubApiError("GET", "/auth/userinfo", {
      statusCode: 500,
      detail: "Internal Server Error",
    }).as("userinfo");

    fillCredentials();
    cy.getBySel("login-submit").click();

    cy.wait("@token");
    cy.getBySel("login-error").should("have.text", "Internal Server Error");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "auth_token")
      .should("be.null");
    // A reload must not sign in a user who was told sign-in failed.
    cy.reload();
    cy.wait("@userinfo")
      .its("request.headers")
      .should("not.have.property", "authorization");
    cy.getBySel("login-username").should("be.visible");
  });

  it("links to password recovery and signup", () => {
    cy.getBySel("login-forgot-link")
      .should("have.text", "Forgot your password?")
      .click();
    cy.location("pathname").should("eq", "/forgot-password");
    cy.go("back");
    cy.getBySel("login-signup-link").should("have.text", "Sign up").click();
    cy.location("pathname").should("eq", "/signup");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("heading", { name: "Alter Tracker" }).should("be.visible");
    cy.getBySel("auth-subtitle").should("have.text", "Staff portal");
    cy.checkA11yAA();
  });
});

describe("Login when already signed in", () => {
  it("sends the visitor of / straight to the dashboard", () => {
    cy.loginAs("staff");
    stubDashboardPage();
    cy.visit("/");
    cy.location("pathname").should("eq", "/dashboard");
    cy.getBySel("login-username").should("not.exist");
    cy.getBySel("shell-username").should("have.text", "door");
  });
});
