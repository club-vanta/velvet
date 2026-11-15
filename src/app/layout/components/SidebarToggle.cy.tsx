import { SidebarToggle } from "./SidebarToggle";

describe("<SidebarToggle />", () => {
  beforeEach(() => {
    // The toggle is for desktops only (hidden below md).
    cy.viewport(1024, 600);
  });

  it("offers to hide an open sidebar", () => {
    cy.mount(<SidebarToggle open onToggle={cy.spy().as("onToggle")} />);
    cy.getByRole("button", { name: "Hide sidebar" })
      .should("have.attr", "aria-expanded", "true")
      .click();
    cy.get("@onToggle").should("have.been.calledOnce");
  });

  it("offers to show a hidden sidebar", () => {
    cy.mount(<SidebarToggle open={false} onToggle={cy.spy()} />);
    cy.getByRole("button", { name: "Show sidebar" }).should(
      "have.attr",
      "aria-expanded",
      "false",
    );
  });

  it("speaks Spanish in the Spanish UI", () => {
    cy.mount(<SidebarToggle open onToggle={cy.spy()} />, { lang: "es" });
    cy.getBySel("shell-sidebar-toggle").should(
      "have.attr",
      "aria-label",
      "Ocultar barra lateral",
    );
  });

  it("toggles with the keyboard", () => {
    cy.mount(<SidebarToggle open onToggle={cy.spy().as("onToggle")} />);
    cy.getBySel("shell-sidebar-toggle").focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.get("@onToggle").should("have.been.calledOnce");
  });

  it("is hidden on phones", () => {
    cy.viewport(375, 812);
    cy.mount(<SidebarToggle open onToggle={cy.spy()} />);
    cy.getBySel("shell-sidebar-toggle").should("not.be.visible");
  });

  it("has no accessibility violations", () => {
    cy.mount(<SidebarToggle open onToggle={cy.spy()} />);
    cy.checkA11yAA();
  });
});
