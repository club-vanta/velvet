import { makeUser } from "@/tests/factories";
import { SignupPage } from "./SignupPage";

describe("<SignupPage />", () => {
  beforeEach(() => {
    cy.mount(<SignupPage />);
  });

  it("ties the 15-character hint to the password field", () => {
    cy.getByRole("textbox", { name: "Username" }).should(
      "have.attr",
      "required",
    );
    cy.getBySel("signup-password")
      .should("have.attr", "autocomplete", "new-password")
      .and(($field) => {
        const hintId = $field.attr("aria-describedby") ?? "";
        const hint = $field[0].ownerDocument.getElementById(hintId);
        expect(hint?.textContent).to.equal("Minimum 15 characters.");
      });
  });

  it("reaches the password toggle with the keyboard", () => {
    cy.getBySel("signup-password").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused()
      .should("have.attr", "data-cy", "password-visibility")
      .and("have.attr", "aria-label", "Show password");
  });

  it("shows Signing up… and then the success message", () => {
    cy.stubApi("POST", "/auth/register", {
      body: makeUser({ username: "luna" }),
      statusCode: 201,
      delay: 500,
    });
    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type("fifteen-chars-ok");
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-submit")
      .should("be.disabled")
      .and("have.text", "Signing up…");
    cy.getBySel("signup-success").should("be.visible");
    cy.getByRole("link", { name: "Back to login" }).should(
      "have.attr",
      "href",
      "/",
    );
    cy.getBySel("signup-login-link").should("not.exist");
  });

  it("names a taken username", () => {
    cy.stubApiError("POST", "/auth/register", { statusCode: 409 });
    cy.getBySel("signup-username").type("luna");
    cy.getBySel("signup-password").type("fifteen-chars-ok");
    cy.getBySel("signup-submit").click();
    cy.getBySel("signup-error").should(
      "have.text",
      "Username is already taken.",
    );
  });

  it("has no accessibility violations", () => {
    cy.checkA11yAA();
  });
});
