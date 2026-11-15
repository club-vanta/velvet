import { AuthSuccess } from "./AuthSuccess";

describe("<AuthSuccess />", () => {
  it("shows the message and a way back to login", () => {
    cy.mount(<AuthSuccess message="All done." name="signup" />, {
      lang: "es",
    });
    cy.getBySel("signup-success")
      .should("have.attr", "role", "alert")
      .and("have.text", "All done.");
    cy.getBySel("signup-back-to-login")
      .should("have.text", "Volver al inicio")
      .and("have.attr", "href", "/");
    cy.checkA11yAA();
  });
});
