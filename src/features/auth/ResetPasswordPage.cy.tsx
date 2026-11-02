import { Navigate, Route, Routes } from "react-router-dom";
import { ResetPasswordPage } from "./ResetPasswordPage";

const VALID_STATE = { username: "alice", code: "123456" };

/** Opens the reset page the only way the app does: with router state. */
function mountPage(state: unknown = VALID_STATE, lang: "en" | "es" = "en") {
  cy.mount(
    <Routes>
      <Route
        path="/start"
        element={<Navigate to="/reset-password" state={state} />}
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<p data-cy="login-page">login</p>} />
    </Routes>,
    { path: "/start", lang },
  );
}

function submit(password = "mysupersecretpass") {
  cy.getBySel("reset-password").type(password);
  cy.getBySel("reset-submit").click();
}

describe("<ResetPasswordPage />", () => {
  for (const [why, state] of [
    ["without state", null],
    ["without a username", { code: "123456" }],
    ["without a code", { username: "alice" }],
  ] as const) {
    it(`goes back to login ${why}`, () => {
      mountPage(state);
      cy.getBySel("login-page").should("be.visible");
      cy.getBySel("reset-password").should("not.exist");
    });
  }

  it("renders the new-password field and the set-password button", () => {
    mountPage(VALID_STATE, "es");
    cy.getBySel("reset-password")
      .should("have.attr", "type", "password")
      .and("have.attr", "minlength", "15")
      .and("have.attr", "autocomplete", "new-password");
    cy.getByRole("button", { name: "Establecer contraseña" }).should(
      "be.enabled",
    );
  });

  it("shows and hides the password", () => {
    mountPage(VALID_STATE, "es");
    cy.getByRole("button", { name: "Mostrar contraseña" }).click();
    cy.getBySel("reset-password").should("have.attr", "type", "text");
    cy.getByRole("button", { name: "Ocultar contraseña" }).click();
    cy.getBySel("reset-password").should("have.attr", "type", "password");
  });

  it("shows Saving… while the request is in flight", () => {
    mountPage();
    cy.stubApi("POST", "/auth/reset-password", {
      body: { username: "alice" },
      delay: 1000,
    });
    submit();
    cy.getBySel("reset-submit")
      .should("be.disabled")
      .and("have.text", "Saving…");
  });

  it("sends the code with the new password and congratulates the user", () => {
    mountPage();
    cy.stubApi("POST", "/auth/reset-password", {
      body: { username: "alice" },
    }).as("resetPassword");
    submit();
    cy.wait("@resetPassword").its("request.body").should("deep.equal", {
      username: "alice",
      code: "123456",
      new_password: "mysupersecretpass",
    });
    cy.getBySel("reset-success").should(
      "have.text",
      "Congratulations alice, you've successfully changed your password!",
    );
    cy.getBySel("reset-password").should("not.exist");
  });

  it("goes back to login after the change", () => {
    mountPage();
    cy.stubApi("POST", "/auth/reset-password", { body: { username: "alice" } });
    submit();
    cy.getByRole("link", { name: "Back to login" }).click();
    cy.getBySel("login-page").should("be.visible");
  });

  it("shows the backend's message on failure", () => {
    mountPage();
    cy.stubApiError("POST", "/auth/reset-password", {
      statusCode: 400,
      detail: "Código inválido o expirado.",
    });
    submit();
    cy.getBySel("reset-error").should(
      "have.text",
      "Código inválido o expirado.",
    );
  });

  it("explains a network error in the UI language", () => {
    mountPage(VALID_STATE, "es");
    cy.stubApiError("POST", "/auth/reset-password", {
      statusCode: 0,
      forceNetworkError: true,
    });
    submit();
    cy.getBySel("reset-error").should(
      "have.text",
      "No se pudo conectar con el servidor.\nVerificá tu conexión.",
    );
  });

  it("has no accessibility violations, before and after the change", () => {
    mountPage();
    cy.getBySel("reset-password").should("be.visible");
    cy.checkA11yAA();
    cy.stubApi("POST", "/auth/reset-password", { body: { username: "alice" } });
    submit();
    cy.getBySel("reset-success").should("be.visible");
    cy.checkA11yAA();
  });
});
