import { NAV_ITEMS } from "../navItems";
import { SidebarNav } from "./SidebarNav";

const items = [...NAV_ITEMS];

describe("<SidebarNav />", () => {
  beforeEach(() => {
    cy.viewport(1024, 700);
  });

  it("lists the items with their full labels", () => {
    cy.mount(<SidebarNav items={items} badges={{}} open />);
    cy.getBySel("shell-sidebar-label").should(($labels) => {
      expect(Cypress._.map($labels, "textContent")).to.deep.equal([
        "Dashboard",
        "Meetups",
        "Guests",
        "Statistics",
        "Staff",
        "Audit Log",
        "Organizations",
      ]);
    });
  });

  it("marks the current page, also on its sub-pages", () => {
    cy.mount(<SidebarNav items={items} badges={{}} open />, {
      path: "/meetups/meetup-1",
    });
    cy.getBySel("shell-sidebar-link-meetups").should(
      "have.attr",
      "aria-current",
      "page",
    );
    cy.getBySel("shell-sidebar-link-dashboard").should(
      "not.have.attr",
      "aria-current",
    );
  });

  it("shows a badge next to an item with a count", () => {
    cy.mount(
      <SidebarNav items={items} badges={{ staff: 4, guests: 0 }} open />,
    );
    cy.getBySel("shell-sidebar-link-staff")
      .findBySel("shell-pending-badge")
      .should("have.text", "Pending approvals: 4");
    cy.getBySel("shell-pending-badge").should("have.length", 1);
  });

  it("hides when closed", () => {
    cy.mount(<SidebarNav items={items} badges={{}} open={false} />);
    cy.getBySel("shell-sidebar").should("not.be.visible");
  });

  it("is a labelled landmark without accessibility violations", () => {
    cy.mount(<SidebarNav items={items} badges={{ staff: 2 }} open />);
    cy.getByRole("navigation", { name: "Main navigation" }).should(
      "be.visible",
    );
    cy.checkA11yAA();
  });
});
