import { Shell } from "./Shell";

describe("<Shell />", () => {
  context("on a desktop", () => {
    beforeEach(() => {
      cy.viewport(1280, 800);
    });

    it("hides the stats link from org staff", () => {
      cy.mount(<Shell>content</Shell>, { as: "staff", lang: "es" });
      cy.getBySel("shell-username").should("have.text", "door");
      cy.getBySel("shell-sidebar-link-dashboard").should("have.text", "Panel");
      cy.getByRole("link", { name: "Estadísticas" }).should("not.exist");
      cy.getBySel("shell-sidebar-link-stats").should("not.exist");
    });

    it("shows the stats link to org admins", () => {
      cy.mount(<Shell>content</Shell>, { as: "orgAdmin", lang: "es" });
      cy.getByRole("link", { name: "Estadísticas" }).should(
        "have.attr",
        "href",
        "/stats",
      );
    });

    it("renders the page inside the main landmark", () => {
      cy.mount(
        <Shell>
          <h1>Page</h1>
        </Shell>,
        { as: "staff" },
      );
      cy.getByRole("main").should("contain.text", "Page");
      cy.checkA11yAA();
    });

    it("names the sidebar toggle in the UI language", () => {
      cy.mount(<Shell>content</Shell>, { as: "staff", lang: "es" });
      cy.getByRole("button", { name: "Ocultar barra lateral" }).click();
      cy.getBySel("shell-sidebar").should("not.be.visible");
      cy.getByRole("button", { name: "Mostrar barra lateral" }).click();
      cy.getBySel("shell-sidebar").should("be.visible");
    });
  });

  context("on a phone", () => {
    beforeEach(() => {
      cy.viewport(375, 812);
    });

    it("shows the short stats label in the bottom nav", () => {
      cy.mount(<Shell>content</Shell>, { as: "orgAdmin", lang: "es" });
      cy.getBySel("shell-sidebar").should("not.be.visible");
      cy.getByRole("link", { name: "Stats" }).should(
        "have.attr",
        "href",
        "/stats",
      );
    });

    it("keeps each bottom-nav label inside its own slot", () => {
      cy.mount(<Shell>content</Shell>, { as: "siteAdmin", lang: "es" });
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
  });
});
