import { stubDashboard } from "../../support/routes/dashboard";
import { USERS, makePendingUser, makeUser } from "../../../src/tests/factories";

describe("Dashboard by role", () => {
  it("shows site admins the pending approvals, linked to the staff page", () => {
    cy.loginAs("siteAdmin");
    stubDashboard();
    cy.stubApi("GET", "/staff/pending", {
      body: [makePendingUser({ id: 11 }), makePendingUser({ id: 12 })],
    }).as("getPending");
    cy.visit("/dashboard");
    cy.wait("@getPending");

    cy.getBySel("dashboard-pending-approvals")
      .should("have.text", "2")
      .and("have.attr", "href", "/staff");
    cy.getBySel("dashboard-total-meetups").should("have.text", "0");
  });

  it("shows site admins zero pending approvals when nobody waits", () => {
    cy.loginAs("siteAdmin");
    stubDashboard();
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-pending-approvals").should("have.text", "0");
  });

  (["staff", "orgAdmin"] as const).forEach((role) => {
    it(`hides pending approvals from ${role} and never asks for them`, () => {
      cy.loginAs(role);
      stubDashboard();
      // Any request for the pending list would fail the test as unstubbed.
      cy.visit("/dashboard");
      cy.wait(["@getMeetups", "@getGuests"]);

      cy.getBySel("dashboard-total-meetups").should("have.text", "0");
      cy.getBySel("dashboard-pending-approvals").should("not.exist");
      cy.getBySel("dashboard-new-meetup").should("be.visible");
    });
  });

  it("asks staff without an organization to contact an admin", () => {
    cy.loginAs("staff", {
      user: makeUser({ ...USERS.staff, org_memberships: [] }),
    });
    cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } });
    cy.visit("/dashboard");

    cy.getBySel("dashboard-no-org").should(
      "have.text",
      "No organization assigned. Contact an administrator.",
    );
    cy.getBySel("dashboard-new-meetup").should("not.exist");
    cy.checkA11yAA();
  });

  it("shows the no-organization message to a site admin when no org exists", () => {
    cy.loginAs("siteAdmin");
    cy.stubApi("GET", "/organizations/", {
      body: { total: 0, organizations: [] },
    }).as("getOrgs");
    cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } });
    cy.visit("/dashboard");
    cy.wait("@getOrgs");

    cy.getBySel("dashboard-no-org").should("be.visible");
  });
});
