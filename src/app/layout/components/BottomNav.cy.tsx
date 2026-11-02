import { NAV_ITEMS } from "../navItems";
import { BottomNav } from "./BottomNav";

const items = [...NAV_ITEMS];

describe("<BottomNav />", () => {
  beforeEach(() => {
    cy.viewport(375, 812);
  });

  it("uses the short labels where there are some", () => {
    cy.mount(<BottomNav items={items} badges={{}} />, { lang: "es" });
    cy.getBySel("shell-bottom-label").should(($labels) => {
      expect(Cypress._.map($labels, "textContent")).to.deep.equal([
        "Panel",
        "Eventos",
        "Invitados",
        "Stats",
        "Staff",
        "Log",
        "Orgs",
      ]);
    });
  });

  it("marks the current page", () => {
    cy.mount(<BottomNav items={items} badges={{}} />, { path: "/guests/g-1" });
    cy.getBySel("shell-bottom-link-guests").should(
      "have.attr",
      "aria-current",
      "page",
    );
  });

  it("puts a count on an item's icon", () => {
    cy.mount(<BottomNav items={items} badges={{ staff: 12 }} />);
    cy.getBySel("shell-bottom-link-staff")
      .findBySel("shell-pending-badge")
      .should("be.visible")
      .and("have.text", "Pending approvals: 12");
  });

  it("is hidden on desktops", () => {
    cy.viewport(1024, 700);
    cy.mount(<BottomNav items={items} badges={{}} />);
    cy.getBySel("shell-bottom-nav").should("not.be.visible");
  });

  it("has no accessibility violations", () => {
    cy.mount(<BottomNav items={items} badges={{ staff: 2 }} />);
    cy.getByRole("navigation", { name: "Main navigation" }).should(
      "be.visible",
    );
    cy.checkA11yAA();
  });
});
