import type { Role } from "../../../src/tests/factories";
import { stubNavPages } from "../../support/routes/app";

const LABELS: Record<Role, string[]> = {
  staff: ["Dashboard", "Meetups", "Guests"],
  orgAdmin: ["Dashboard", "Meetups", "Guests", "Stats", "Log", "Orgs"],
  siteAdmin: [
    "Dashboard",
    "Meetups",
    "Guests",
    "Stats",
    "Staff",
    "Log",
    "Orgs",
  ],
};

describe(
  "Bottom navigation",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    for (const role of ["staff", "orgAdmin", "siteAdmin"] as const) {
      it(`shows ${role} their pages with short labels`, () => {
        cy.loginAs(role);
        stubNavPages();
        cy.visit("/dashboard");

        cy.getBySel("shell-sidebar").should("not.be.visible");
        cy.getBySel("shell-sidebar-toggle").should("not.be.visible");
        cy.getBySel("shell-bottom-nav")
          .should("be.visible")
          .findBySel("shell-bottom-label")
          .should(($labels) => {
            expect(Cypress._.map($labels, "textContent")).to.deep.equal(
              LABELS[role],
            );
          });
      });
    }

    it("keeps every label inside its own slot on a 375px screen", () => {
      cy.loginAs("siteAdmin");
      stubNavPages();
      cy.visit("/dashboard");

      cy.getBySelLike("shell-bottom-link-")
        .should("have.length", 7)
        .each(($link) => {
          const slot = $link[0].getBoundingClientRect();
          const label = $link
            .find('[data-cy="shell-bottom-label"]')[0]
            .getBoundingClientRect();
          expect(label.left).to.be.at.least(slot.left);
          expect(label.right).to.be.at.most(slot.right);
        });
    });

    it("opens a page and marks it as the current one", () => {
      cy.loginAs("staff");
      stubNavPages();
      cy.visit("/dashboard");

      cy.getBySel("shell-bottom-link-guests").click();

      cy.location("pathname").should("eq", "/guests");
      cy.getBySel("shell-bottom-link-guests").should(
        "have.attr",
        "aria-current",
        "page",
      );
      cy.getBySel("shell-bottom-link-dashboard").should(
        "not.have.attr",
        "aria-current",
      );
    });

    it("keeps the logout button named when only its icon shows", () => {
      cy.loginAs("staff");
      stubNavPages();
      cy.visit("/dashboard");

      cy.getByRole("button", { name: "Logout" }).should("be.visible");
      cy.checkA11yAA();
    });
  },
);
