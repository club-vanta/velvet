import { useLocation } from "react-router-dom";
import { OrgSwitcher } from "./OrgSwitcher";

function Pathname() {
  return <output data-cy="pathname">{useLocation().pathname}</output>;
}

describe("<OrgSwitcher />", () => {
  it("renders nothing while signed out (no organizations)", () => {
    cy.mount(
      <div data-cy="host">
        <OrgSwitcher />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("speaks Spanish in the Spanish UI", () => {
    cy.mount(<OrgSwitcher />, { as: "staff", lang: "es" });
    cy.getByRole("button", { name: "Organización: Club Vanta" }).should(
      "be.visible",
    );
  });

  context("signed in", () => {
    beforeEach(() => {
      cy.mount(
        <>
          <OrgSwitcher />
          <Pathname />
        </>,
        { as: "staff", path: "/meetups/meetup-1" },
      );
    });

    it("names the active organization", () => {
      cy.getByRole("button", { name: "Organization: Club Vanta" }).should(
        "be.visible",
      );
      cy.getBySel("shell-active-org").should("have.text", "Club Vanta");
    });

    it("goes to the dashboard after picking an organization", () => {
      cy.getBySel("shell-org-switcher").click();
      cy.getBySel("shell-org-option-org-1")
        .should("have.text", "Club Vanta")
        .and("have.class", "font-medium")
        .click();
      cy.getBySel("pathname").should("have.text", "/dashboard");
      cy.window()
        .its("localStorage")
        .invoke("getItem", "active_org_id")
        .should("eq", "org-1");
    });

    it("has no accessibility violations, open or closed", () => {
      cy.getBySel("shell-active-org").should("be.visible");
      cy.checkA11yAA();
      cy.getBySel("shell-org-switcher").click();
      cy.getBySel("shell-org-menu").should("be.visible");
      cy.checkA11yAA();
    });
  });
});
