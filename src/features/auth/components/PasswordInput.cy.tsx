import { PasswordInput } from "./PasswordInput";

describe("<PasswordInput />", () => {
  beforeEach(() => {
    cy.mount(
      <>
        <label htmlFor="pw">Password</label>
        <PasswordInput id="pw" data-cy="field" defaultValue="hunter2-hunter2" />
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

  it("has no accessibility violations", () => {
    cy.checkA11yAA();
  });
});
