import { stubNavPages } from "../../support/routes/app";

/** The Shell's own strings, read where the viewer sees or hears them. */
function expectShellCopy(copy: {
  nav: string[];
  heading: string;
  logout: string;
  toggle: string;
  menu: string;
}) {
  cy.getBySel("shell-sidebar").should(($nav) => {
    expect(Cypress._.map($nav.find("a"), "textContent")).to.deep.equal(
      copy.nav,
    );
  });
  cy.getByRole("heading", { name: copy.heading }).should("be.visible");
  cy.getBySel("shell-logout").should("have.text", copy.logout);
  cy.getBySel("shell-sidebar-toggle").should(
    "have.attr",
    "aria-label",
    copy.toggle,
  );
  cy.getBySel("shell-language-menu").should(
    "have.attr",
    "aria-label",
    copy.menu,
  );
}

const ENGLISH = {
  nav: [
    "Dashboard",
    "Meetups",
    "Guests",
    "Statistics",
    "Audit Log",
    "Organizations",
  ],
  heading: "Dashboard",
  logout: "Logout",
  toggle: "Hide sidebar",
  menu: "Language",
};

const SPANISH = {
  nav: [
    "Panel",
    "Eventos",
    "Invitados",
    "Estadísticas",
    "Reg. Auditoría",
    "Organizaciones",
  ],
  heading: "Panel",
  logout: "Cerrar sesión",
  toggle: "Ocultar barra lateral",
  menu: "Idioma",
};

function chooseLanguage(lang: "en" | "es") {
  cy.getBySel("shell-language-menu").click();
  cy.getBySel(`shell-language-option-${lang}`).click();
}

describe("Language switch", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
    stubNavPages();
    cy.visit("/dashboard");
  });

  it("switches every Shell string to Spanish and back", () => {
    expectShellCopy(ENGLISH);

    chooseLanguage("es");
    expectShellCopy(SPANISH);

    chooseLanguage("en");
    expectShellCopy(ENGLISH);
  });

  it("remembers the language after a reload", () => {
    chooseLanguage("es");
    cy.getBySel("shell-logout").should("have.text", "Cerrar sesión");

    cy.reload();

    expectShellCopy(SPANISH);
    cy.window()
      .its("localStorage")
      .invoke("getItem", "lang")
      .should("eq", "es");
  });

  it("names each language in itself", () => {
    cy.getByRole("button", { name: "Language" }).click();
    cy.getBySel("shell-language-option-es")
      .should("have.text", "🇦🇷 Español")
      .and("have.attr", "lang", "es");
    cy.getBySel("shell-language-option-en")
      .should("have.text", "🇺🇸 English")
      .and("have.attr", "lang", "en");
    cy.checkA11yAA('[data-cy="shell-language-options"]');
  });

  it("switches with the keyboard alone", () => {
    cy.getBySel("shell-sidebar-toggle").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "shell-language-menu");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.getBySel("shell-language-options").should("be.visible");
    // The first option takes the focus; arrows move through the options.
    cy.focused().should("have.attr", "data-cy", "shell-language-option-es");
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.focused().should("have.attr", "data-cy", "shell-language-option-en");
    cy.press(Cypress.Keyboard.Keys.UP);
    cy.focused().should("have.attr", "data-cy", "shell-language-option-es");
    cy.press(Cypress.Keyboard.Keys.ENTER);

    cy.getBySel("shell-language-options").should("not.exist");
    cy.getBySel("shell-logout").should("have.text", "Cerrar sesión");
  });
});
