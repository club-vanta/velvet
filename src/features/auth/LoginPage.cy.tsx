import { LoginPage } from "./LoginPage";

describe("<LoginPage />", () => {
  it("links to password recovery next to the signup link", () => {
    cy.mount(<LoginPage />, { lang: "es" });
    cy.getByRole("link", { name: "¿Olvidaste tu contraseña?" })
      .should("be.visible")
      .and("have.attr", "href", "/forgot-password");
    cy.getByRole("link", { name: "Registrate" })
      .should("be.visible")
      .and("have.attr", "href", "/signup");
    cy.getBySel("login-signup-link")
      .parent()
      .should("have.text", "¿No tenés cuenta? Registrate");
  });

  it("labels the fields and requires both", () => {
    cy.mount(<LoginPage />);
    cy.getByRole("textbox", { name: "Username" })
      .should("have.attr", "autocomplete", "username")
      .and("have.attr", "required");
    cy.getBySel("login-password")
      .should("have.attr", "type", "password")
      .and("have.attr", "autocomplete", "current-password")
      .and("have.attr", "required");
  });

  it("shows no error before the first attempt", () => {
    cy.mount(<LoginPage />);
    cy.getBySel("login-submit").should("have.text", "Sign in");
    cy.getBySel("login-error").should("not.exist");
  });

  it("shows the backend's error and lets the user retry", () => {
    cy.mount(<LoginPage />);
    cy.stubApiError("POST", "/auth/token", {
      statusCode: 401,
      detail: "Incorrect username or password.",
    });
    cy.getBySel("login-username").type("door");
    cy.getBySel("login-password").type("wrong-password-123");
    cy.getBySel("login-submit").click();
    cy.getBySel("login-error").should(
      "have.text",
      "Incorrect username or password.",
    );
    cy.getBySel("login-submit").should("be.enabled");
  });

  it("has no accessibility violations", () => {
    cy.mount(<LoginPage />);
    cy.checkA11yAA();
  });
});
