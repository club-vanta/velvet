import { useLanguage } from "@/lib/i18n";
import { LanguageMenu } from "./LanguageMenu";

/** A string of the current language, to see the switch take effect. */
function LogoutLabel() {
  const { t } = useLanguage();
  return <p data-cy="probe">{t("logout")}</p>;
}

describe("<LanguageMenu />", () => {
  beforeEach(() => {
    cy.mount(
      <>
        <LanguageMenu />
        <LogoutLabel />
      </>,
    );
  });

  it("shows the current language's flag behind a named button", () => {
    cy.getByRole("button", { name: "Language" })
      .should("have.attr", "aria-haspopup", "menu")
      .and("contain.text", "🇺🇸");
  });

  it("switches the UI language and stores it", () => {
    cy.getBySel("shell-language-menu").click();
    // The flag is decoration: the option is read as its name alone.
    cy.getByRole("menuitem", { name: "Español" }).click();

    cy.getBySel("probe").should("have.text", "Cerrar sesión");
    cy.getBySel("shell-language-menu")
      .should("have.attr", "aria-label", "Idioma")
      .and("contain.text", "🇦🇷");
    cy.window()
      .its("localStorage")
      .invoke("getItem", "lang")
      .should("eq", "es");
  });

  it("marks the current language", () => {
    cy.getBySel("shell-language-menu").click();
    cy.getBySel("shell-language-option-en").should("have.class", "font-medium");
    cy.getBySel("shell-language-option-es").should(
      "not.have.class",
      "font-medium",
    );
  });

  it("closes with Escape and returns the focus", () => {
    cy.getBySel("shell-language-menu").click();
    cy.getBySel("shell-language-options").should("be.visible");
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getBySel("shell-language-options").should("not.exist");
    cy.focused().should("have.attr", "data-cy", "shell-language-menu");
  });

  it("has no accessibility violations, open or closed", () => {
    cy.checkA11yAA();
    cy.getBySel("shell-language-menu").click();
    cy.getBySel("shell-language-options").should("be.visible");
    cy.checkA11yAA();
  });
});
