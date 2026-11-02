import { makeUser } from "../../../src/tests/factories";
import { stubNavPages } from "../../support/routes/app";

const pendingAccounts = [
  makeUser({ id: 10, username: "nuevo", is_approved: false }),
  makeUser({ id: 11, username: "otra", is_approved: false }),
];

describe("Pending approvals badge", () => {
  it("shows site admins how many accounts wait for approval", () => {
    cy.loginAs("siteAdmin");
    stubNavPages();
    cy.stubApi("GET", "/staff/pending", { body: pendingAccounts }).as(
      "pending",
    );
    cy.visit("/dashboard");

    cy.wait("@pending");
    cy.getBySel("shell-sidebar-link-staff")
      .findBySel("shell-pending-badge")
      .should("have.text", "2 pending approvals");
    cy.getByRole("link", { name: "Staff 2 pending approvals" }).should(
      "be.visible",
    );
  });

  it("shows the badge on the bottom nav on phones", () => {
    cy.viewport(375, 812);
    cy.loginAs("siteAdmin");
    stubNavPages();
    cy.stubApi("GET", "/staff/pending", { body: pendingAccounts });
    cy.visit("/dashboard");

    cy.getBySel("shell-bottom-link-staff")
      .findBySel("shell-pending-badge")
      .should("be.visible")
      .and("have.text", "2 pending approvals");
  });

  it("shows no badge when nobody waits", () => {
    cy.loginAs("siteAdmin");
    stubNavPages();
    cy.visit("/dashboard");

    cy.getBySel("shell-sidebar-link-staff").should("be.visible");
    cy.getBySel("shell-pending-badge").should("not.exist");
  });

  it("shows no badge when the list fails to load", () => {
    cy.loginAs("siteAdmin");
    stubNavPages();
    cy.stubApiError("GET", "/staff/pending", { statusCode: 500 }).as("pending");
    cy.visit("/dashboard");

    cy.wait("@pending");
    cy.getBySel("shell-sidebar-link-staff").should("be.visible");
    cy.getBySel("shell-pending-badge").should("not.exist");
  });

  it("never asks for pending approvals for org admins", () => {
    // /staff/pending is not stubbed for org admins: a request fails the test.
    cy.loginAs("orgAdmin");
    stubNavPages();
    cy.visit("/dashboard");

    cy.getBySel("shell-sidebar-link-dashboard").should("be.visible");
    cy.getBySel("shell-sidebar-link-staff").should("not.exist");
    cy.getBySel("shell-pending-badge").should("not.exist");
  });
});
