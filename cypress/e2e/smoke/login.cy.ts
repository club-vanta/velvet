import { SMOKE_USERS, seedBackend } from "../../support/smoke";

// Real backend: the login form talks to /auth/token and /auth/userinfo.
describe("Smoke: login against the backend", () => {
  beforeEach(() => {
    seedBackend();
    cy.visit("/", {
      onBeforeLoad: (win) => win.localStorage.setItem("lang", "en"),
    });
  });

  it("signs in with a seeded account and shows its organization", () => {
    cy.env(["e2ePassword"]).then(({ e2ePassword }) => {
      cy.getBySel("login-username").type(SMOKE_USERS.door);
      cy.getBySel("login-password").type(String(e2ePassword), { log: false });
    });
    cy.getBySel("login-submit").click();

    cy.location("pathname").should("eq", "/dashboard");
    cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
    cy.getByRole("button", { name: "E2E Club" }).should("be.visible");
  });

  it("rejects a wrong password with the backend's message", () => {
    cy.getBySel("login-username").type(SMOKE_USERS.door);
    cy.getBySel("login-password").type("not-the-password-at-all");
    cy.getBySel("login-submit").click();

    cy.getBySel("login-error").should("be.visible");
    cy.location("pathname").should("eq", "/");
  });
});
