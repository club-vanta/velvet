import { USERS } from "../../../src/tests/factories";
import { stubNavPages } from "../../support/routes/app";

describe("Session", () => {
  it("restores the session after a reload", () => {
    cy.loginAs("staff");
    stubNavPages();
    cy.visit("/meetups");
    cy.wait("@userinfo")
      .its("request.headers.authorization")
      .should("eq", "Bearer stub-token-staff");

    cy.reload();

    cy.wait("@userinfo")
      .its("request.headers.authorization")
      .should("eq", "Bearer stub-token-staff");
    cy.location("pathname").should("eq", "/meetups");
    cy.getBySel("shell-username").should("have.text", "door");
    cy.getByRole("heading", { name: "Meetups" }).should("be.visible");
  });

  it("signs out when any request answers 401", () => {
    cy.loginAs("orgAdmin");
    stubNavPages();
    cy.visit("/dashboard");
    cy.getBySel("shell-username").should("have.text", "owner");

    // The token expired: the next request is refused, and so is the session.
    cy.stubApiError("GET", "/organizations/{org_id}/events/", {
      statusCode: 401,
      detail: "Could not validate credentials",
    }).as("events");
    cy.stubApiError("GET", "/auth/userinfo", { statusCode: 401 });
    cy.getBySel("shell-sidebar-link-events").click();

    cy.wait("@events");
    cy.location("pathname").should("eq", "/");
    cy.getBySel("login-username").should("be.visible");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "auth_token")
      .should("be.null");
  });

  it("keeps the token when the server cannot be reached on load", () => {
    cy.loginAs("staff");
    stubNavPages();
    cy.stubApiError("GET", "/auth/userinfo", {
      statusCode: 0,
      forceNetworkError: true,
    });
    cy.visit("/meetups");
    cy.getBySel("login-username").should("be.visible");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "auth_token")
      .should("eq", "stub-token-staff");

    // Back online: the same token signs the user in again.
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.staff });
    cy.visit("/meetups");
    cy.location("pathname").should("eq", "/meetups");
    cy.getBySel("shell-username").should("have.text", "door");
  });
});
