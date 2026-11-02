import { stubDashboard } from "../../support/routes/dashboard";

// /staff manages every account on the site, so only site admins reach it.
describe("Staff page access", () => {
  (["staff", "orgAdmin"] as const).forEach((role) => {
    it(`sends ${role} to the dashboard and hides the Staff link`, () => {
      cy.loginAs(role);
      stubDashboard();
      cy.visit("/staff");

      cy.location("pathname").should("eq", "/dashboard");
      cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
      cy.getByRole("link", { name: "Staff" }).should("not.exist");
    });
  });

  it("lets a site admin open the page from the navigation", () => {
    cy.loginAs("siteAdmin");
    stubDashboard();
    cy.stubApi("GET", "/staff/", { body: [] }).as("getStaff");
    cy.visit("/dashboard");

    cy.getByRole("link", { name: "Staff" }).first().click();

    cy.wait("@getStaff");
    cy.location("pathname").should("eq", "/staff");
    cy.getByRole("heading", { name: "Staff Management" }).should("be.visible");
  });
});
