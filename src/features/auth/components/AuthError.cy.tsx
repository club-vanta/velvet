import { AuthError } from "./AuthError";

describe("<AuthError />", () => {
  it("renders nothing without a message", () => {
    cy.mount(
      <div data-cy="host">
        <AuthError message={undefined} data-cy="error" />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("announces the message as an alert, keeping its line breaks", () => {
    cy.mount(
      <AuthError message={"First line.\nSecond line."} data-cy="error" />,
    );
    cy.getBySel("error")
      .should("have.attr", "role", "alert")
      .and("have.text", "First line.\nSecond line.");
    cy.getBySel("error").should(($alert) => {
      const height = $alert[0].getBoundingClientRect().height;
      const lineHeight = parseFloat(getComputedStyle($alert[0]).lineHeight);
      // Two lines of text, not one: the break is rendered.
      expect(height).to.be.greaterThan(lineHeight * 2);
    });
    cy.checkA11yAA();
  });
});
