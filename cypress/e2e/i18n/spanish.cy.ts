// Walks the Shell, the navigation and the signed-out pages in Spanish, the
// default language of the door staff. The feature specs cover their pages.
import { makeUser } from "../../../src/tests/factories";
import { stubNavPages } from "../../support/routes/app";
import {
  expectFieldHint,
  expectFieldLabel,
  openResetPassword,
  visitSignedOut,
} from "../../support/routes/auth";

describe("Spanish", () => {
  context("signed out", () => {
    it("shows the login page in Spanish", () => {
      visitSignedOut("/", "es");
      cy.getBySel("auth-subtitle").should("have.text", "Portal de staff");
      expectFieldLabel("login-username", "Usuario");
      expectFieldLabel("login-password", "Contraseña");
      cy.getByRole("button", { name: "Mostrar contraseña" }).should(
        "be.visible",
      );
      cy.getBySel("login-submit").should("have.text", "Iniciar sesión");
      cy.getBySel("login-forgot-link").should(
        "have.text",
        "¿Olvidaste tu contraseña?",
      );
      cy.getBySel("login-signup-link").should("have.text", "Registrate");
      cy.checkA11yAA();
    });

    it("explains a network error in Spanish", () => {
      visitSignedOut("/", "es");
      cy.stubApiError("POST", "/auth/token", {
        statusCode: 0,
        forceNetworkError: true,
      });
      cy.getBySel("login-username").type("door");
      cy.getBySel("login-password").type("a-very-long-password");
      cy.getBySel("login-submit").click();
      cy.getBySel("login-error").should(
        "have.text",
        "No se pudo conectar con el servidor.\nVerificá tu conexión.",
      );
    });

    it("shows the signup page and its errors in Spanish", () => {
      visitSignedOut("/signup", "es");
      cy.getBySel("auth-subtitle").should("have.text", "Crear cuenta");
      expectFieldHint("signup-password", "Mínimo 15 caracteres.");
      cy.getBySel("signup-submit").should("have.text", "Registrarse");

      cy.getBySel("signup-username").type("luna");
      cy.getBySel("signup-password").type("corta");
      cy.getBySel("signup-submit").click();
      cy.getBySel("signup-password").should(
        "have.prop",
        "validationMessage",
        "Mínimo 15 caracteres.",
      );

      cy.stubApiError("POST", "/auth/register", { statusCode: 409 });
      cy.getBySel("signup-password").type("-y-ahora-larga");
      cy.getBySel("signup-submit").click();
      cy.getBySel("signup-error").should(
        "have.text",
        "El nombre de usuario ya está en uso.",
      );

      cy.stubApi("POST", "/auth/register", {
        body: makeUser({ username: "luna" }),
        statusCode: 201,
      });
      cy.getBySel("signup-submit").click();
      cy.getBySel("signup-success").should(
        "have.text",
        "¡Te registraste correctamente! Ya podés iniciar sesión con tus credenciales.",
      );
      cy.getBySel("signup-back-to-login").should(
        "have.text",
        "Volver al inicio",
      );
    });

    it("walks password recovery in Spanish", () => {
      visitSignedOut("/forgot-password", "es");
      cy.getBySel("auth-subtitle").should("have.text", "Recuperar cuenta");
      expectFieldLabel("forgot-code", "Código de recuperación");
      cy.getBySel("forgot-submit").should("have.text", "Verificar código");
      cy.getBySel("forgot-back-to-login").should(
        "have.text",
        "Volver al inicio",
      );

      openResetPassword("alice", "123456", "es");
      expectFieldLabel("reset-password", "Nueva contraseña");
      cy.getBySel("reset-submit").should("have.text", "Establecer contraseña");
      cy.stubApi("POST", "/auth/reset-password", {
        body: { username: "alice" },
      });
      cy.getBySel("reset-password").type("mi-nueva-clave-larga");
      cy.getBySel("reset-submit").click();
      cy.getBySel("reset-success").should(
        "have.text",
        "¡Felicitaciones alice, cambiaste tu contraseña con éxito!",
      );
    });
  });

  context("signed in as a site admin", () => {
    beforeEach(() => {
      cy.loginAs("siteAdmin", { lang: "es" });
      stubNavPages();
      cy.stubApi("GET", "/staff/pending", {
        body: [makeUser({ id: 10, username: "nuevo", is_approved: false })],
      });
      cy.visit("/dashboard");
    });

    it("shows the Shell in Spanish", () => {
      cy.getByRole("heading", { name: "Panel" }).should("be.visible");
      cy.getByRole("navigation", { name: "Navegación principal" }).should(
        "be.visible",
      );
      cy.getBySel("shell-sidebar").should(($nav) => {
        expect(Cypress._.map($nav.find("a"), "textContent")).to.deep.equal([
          "Panel",
          "Eventos",
          "Invitados",
          "Estadísticas",
          "Staff1 aprobaciones pendientes",
          "Reg. Auditoría",
          "Organizaciones",
        ]);
      });
      cy.getByRole("button", { name: "Ocultar barra lateral" }).click();
      cy.getByRole("button", { name: "Mostrar barra lateral" }).should(
        "be.visible",
      );
      cy.getByRole("button", { name: "Idioma" }).should("be.visible");
      cy.getByRole("button", { name: "Organización: Club Vanta" }).should(
        "be.visible",
      );
      cy.getBySel("shell-logout").should("have.text", "Cerrar sesión");
    });

    it("walks the navigation in Spanish", () => {
      const pages = [
        ["meetups", "/meetups", "Eventos"],
        ["guests", "/guests", "Invitados"],
        ["stats", "/stats", "Estadísticas"],
        ["staff", "/staff", "Gestión de Staff"],
        ["events", "/events", "Registro de Auditoría"],
        ["organizations", "/organizations", "Organizaciones"],
        ["dashboard", "/dashboard", "Panel"],
      ] as const;
      for (const [id, path, heading] of pages) {
        cy.getBySel(`shell-sidebar-link-${id}`).click();
        cy.location("pathname").should("eq", path);
        cy.getByRole("heading", { name: heading }).should("be.visible");
      }
    });

    it("labels the bottom nav in Spanish on phones", () => {
      cy.viewport(375, 812);
      cy.getBySel("shell-bottom-nav")
        .findBySel("shell-bottom-label")
        .should(($labels) => {
          expect(Cypress._.map($labels, "textContent")).to.deep.equal([
            "Panel",
            "Eventos",
            "Invitados",
            "Stats",
            "Staff",
            "Log",
            "Orgs",
          ]);
        });
      cy.getByRole("button", { name: "Cerrar sesión" }).should("be.visible");
    });
  });
});
