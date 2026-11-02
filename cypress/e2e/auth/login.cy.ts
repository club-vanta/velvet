import { USERS } from "../../../src/tests/factories";

describe("Login", () => {
  beforeEach(() => {
    cy.stubApiError("GET", "/auth/userinfo", { statusCode: 401 });
    cy.visit("/", {
      onBeforeLoad: (win) => win.localStorage.setItem("lang", "en"),
    });
  });

  it("signs in and lands on the dashboard", () => {
    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-door", token_type: "bearer" },
    }).as("token");
    cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
      body: { total: 0, meetups: [] },
    });
    cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } });

    cy.getBySel("login-username").type("door");
    cy.getBySel("login-password").type("a-very-long-password");
    // The session request after the token must return the user now.
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.staff });
    cy.getBySel("login-submit").click();

    cy.wait("@token")
      .its("request.body")
      .should("include", "username=door")
      .and("include", "password=a-very-long-password");
    cy.location("pathname").should("eq", "/dashboard");
    cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
  });

  it("shows the backend's error when the credentials are wrong", () => {
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 401,
      detail: "Incorrect username or password",
    });

    cy.getBySel("login-username").type("door");
    cy.getBySel("login-password").type("wrong-password-123");
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should(
      "have.text",
      "Incorrect username or password",
    );
    cy.location("pathname").should("eq", "/");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("heading", { name: "Alter Tracker" }).should("be.visible");
    cy.checkA11yAA();
  });
});
