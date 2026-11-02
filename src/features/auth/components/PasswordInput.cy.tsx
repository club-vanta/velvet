import { PasswordInput } from "./PasswordInput";

describe("<PasswordInput />", () => {
  context("with a value", () => {
    beforeEach(() => {
      cy.mount(
        <>
          <label htmlFor="pw">Password</label>
          <PasswordInput
            id="pw"
            data-cy="field"
            defaultValue="hunter2-hunter2"
          />
        </>,
      );
    });

    it("hides the value until the toggle is pressed", () => {
      cy.getBySel("field").should("have.attr", "type", "password");
      cy.getByRole("button", { name: "Show password" })
        .should("have.attr", "aria-pressed", "false")
        .click();
      cy.getBySel("field").should("have.attr", "type", "text");
      cy.getByRole("button", { name: "Hide password" })
        .should("have.attr", "aria-pressed", "true")
        .click();
      cy.getBySel("field").should("have.attr", "type", "password");
    });

    it("reaches the toggle with the keyboard", () => {
      cy.getBySel("field").focus();
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.focused().should("have.attr", "data-cy", "password-visibility");
    });

    it("does not limit the length of an existing password", () => {
      cy.getBySel("field").clear();
      cy.getBySel("field").type("short");
      cy.getBySel("field")
        .should("match", ":valid")
        .and("not.have.attr", "minlength");
    });

    it("has no accessibility violations", () => {
      cy.checkA11yAA();
    });
  });

  for (const [lang, message] of [
    ["en", "Minimum 15 characters."],
    ["es", "Mínimo 15 caracteres."],
  ] as const) {
    it(`blocks a new password under 15 characters in ${lang}`, () => {
      cy.mount(
        <form>
          <label htmlFor="pw">Password</label>
          <PasswordInput
            id="pw"
            data-cy="field"
            enforceMinLength
            onChange={cy.spy().as("onChange")}
          />
        </form>,
        { lang },
      );
      cy.getBySel("field").should("have.attr", "minlength", "15");
      cy.getBySel("field").type("a".repeat(14));
      cy.getBySel("field")
        .should("match", ":invalid")
        .and("have.prop", "validationMessage", message);
      cy.getBySel("field").type("a");
      cy.getBySel("field").should("match", ":valid");
      cy.get("@onChange").should("have.callCount", 15);
    });
  }
});
