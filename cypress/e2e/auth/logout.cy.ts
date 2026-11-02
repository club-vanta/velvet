import {
  USERS,
  makeMeetup,
  makeMeetupStats,
} from "../../../src/tests/factories";
import { stubDashboardPage } from "../../support/routes/app";

describe("Logout", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubDashboardPage();
    cy.visit("/dashboard");
    cy.getBySel("shell-username").should("have.text", "door");
  });

  it("signs out, forgets the token and returns to login", () => {
    cy.getBySel("shell-logout").should("have.text", "Logout").click();

    cy.location("pathname").should("eq", "/");
    cy.getBySel("login-username").should("be.visible");
    cy.getBySel("shell-sidebar").should("not.exist");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "auth_token")
      .should("be.null");
  });

  it("does not bring the signed-in pages back with the back button", () => {
    cy.getBySel("shell-logout").click();
    cy.location("pathname").should("eq", "/");

    cy.go("back");

    cy.location("pathname").should("eq", "/");
    cy.getBySel("login-username").should("be.visible");
    cy.getBySel("shell-username").should("not.exist");
  });

  it("drops the cached data, so the next person sees only their own", () => {
    // The dashboard features the latest meetup with its numbers.
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
      body: makeMeetupStats(),
    });
    cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
      body: { total: 1, meetups: [makeMeetup({ name: "Door's night" })] },
    }).as("meetups");
    cy.reload();
    cy.wait("@meetups");
    cy.contains("Door's night").should("be.visible");

    cy.getBySel("shell-logout").click();
    cy.stubApi("POST", "/auth/token", {
      body: { access_token: "token-owner", token_type: "bearer" },
    });
    cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
      body: { total: 1, meetups: [makeMeetup({ name: "Owner's night" })] },
      delay: 500,
    }).as("ownerMeetups");
    cy.stubApi("GET", "/auth/userinfo", { body: USERS.orgAdmin });
    cy.getBySel("login-username").type("owner");
    cy.getBySel("login-password").type("a-very-long-password");
    cy.getBySel("login-submit").click();

    // Without the cache cleared, the previous list would show at once
    // (staleTime) instead of waiting for the new request.
    cy.location("pathname").should("eq", "/dashboard");
    cy.contains("Door's night").should("not.exist");
    cy.wait("@ownerMeetups");
    cy.contains("Owner's night").should("be.visible");
  });
});
