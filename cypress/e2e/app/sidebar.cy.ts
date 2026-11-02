import { stubDashboardPage } from "../../support/routes/app";

describe("Sidebar", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubDashboardPage();
    cy.visit("/dashboard");
  });

  it("collapses and stays collapsed after a reload", () => {
    cy.getBySel("shell-sidebar").should("be.visible");
    cy.getByRole("button", { name: "Hide sidebar" })
      .should("have.attr", "aria-expanded", "true")
      .click();
    cy.getBySel("shell-sidebar").should("not.be.visible");
    cy.getBySel("shell-sidebar-toggle")
      .should("have.attr", "aria-label", "Show sidebar")
      .and("have.attr", "aria-expanded", "false");

    cy.reload();

    cy.getBySel("shell-username").should("have.text", "door");
    cy.getBySel("shell-sidebar").should("not.be.visible");
    cy.getByRole("button", { name: "Show sidebar" }).click();
    cy.getBySel("shell-sidebar").should("be.visible");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "sidebar_open")
      .should("eq", "true");
  });

  it("marks the current page and is reachable with the keyboard", () => {
    cy.getBySel("shell-sidebar-link-dashboard").should(
      "have.attr",
      "aria-current",
      "page",
    );
    cy.getBySel("shell-sidebar-link-meetups").should(
      "not.have.attr",
      "aria-current",
    );
    cy.getBySel("shell-sidebar-link-meetups").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "shell-sidebar-link-guests");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("navigation", { name: "Main navigation" }).should(
      "be.visible",
    );
    cy.checkA11yAA();
  });
});
