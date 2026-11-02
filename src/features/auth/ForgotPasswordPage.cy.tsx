import { Route, Routes, useLocation } from "react-router-dom";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

/** Stands in for the reset page: shows where the app went and with what. */
function ResetProbe() {
  const { pathname, state } = useLocation();
  return (
    <>
      <output data-cy="probe-path">{pathname}</output>
      <output data-cy="probe-state">{JSON.stringify(state)}</output>
    </>
  );
}

function mountPage(lang: "en" | "es" = "en") {
  cy.mount(
    <Routes>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetProbe />} />
      <Route path="/" element={<p data-cy="login-page">login</p>} />
    </Routes>,
    { path: "/forgot-password", lang },
  );
}

function submit(username = "alice", code = "123456") {
  cy.getBySel("forgot-username").type(username);
  cy.getBySel("forgot-code").type(code);
  cy.getBySel("forgot-submit").click();
}

describe("<ForgotPasswordPage />", () => {
  it("renders the fields, the verify button and the way back", () => {
    mountPage("es");
    cy.getByRole("heading", { name: "Alter Tracker" }).should("be.visible");
    cy.getByRole("textbox", { name: "Usuario" }).should("be.visible");
    cy.getByRole("textbox", { name: "Código de recuperación" })
      .should("have.attr", "inputmode", "numeric")
      .and("have.attr", "maxlength", "6");
    cy.getByRole("button", { name: "Verificar código" }).should("be.enabled");
    cy.getByRole("link", { name: "Volver al inicio" }).should(
      "have.attr",
      "href",
      "/",
    );
  });

  it("shows Verifying… while the request is in flight", () => {
    mountPage();
    cy.stubApi("POST", "/auth/verify-recovery-code", {
      body: {},
      delay: 1000,
    });
    submit();
    cy.getBySel("forgot-submit")
      .should("be.disabled")
      .and("have.text", "Verifying…");
    cy.getBySel("forgot-username").should("be.disabled");
  });

  it("sends the username and code, then opens the reset page with them", () => {
    mountPage();
    cy.stubApi("POST", "/auth/verify-recovery-code", { body: {} }).as(
      "verifyCode",
    );
    submit("bob", "654321");
    cy.wait("@verifyCode")
      .its("request.body")
      .should("deep.equal", { username: "bob", code: "654321" });
    cy.getBySel("probe-path").should("have.text", "/reset-password");
    cy.getBySel("probe-state").should(
      "have.text",
      JSON.stringify({ username: "bob", code: "654321" }),
    );
  });

  it("shows the backend's message for an invalid code", () => {
    mountPage();
    cy.stubApiError("POST", "/auth/verify-recovery-code", {
      statusCode: 400,
      detail: "Código inválido o expirado.",
    });
    submit("alice", "000000");
    cy.getBySel("forgot-error")
      .should("have.attr", "role", "alert")
      .and("have.text", "Código inválido o expirado.");
  });

  it("explains a network error in the UI language", () => {
    mountPage("es");
    cy.stubApiError("POST", "/auth/verify-recovery-code", {
      statusCode: 0,
      forceNetworkError: true,
    });
    submit();
    cy.getBySel("forgot-error").should(
      "have.text",
      "No se pudo conectar con el servidor.\nVerificá tu conexión.",
    );
  });

  it("clears the error between attempts", () => {
    mountPage();
    cy.stubApiError("POST", "/auth/verify-recovery-code", {
      statusCode: 400,
      detail: "Código inválido o expirado.",
    });
    submit("alice", "000000");
    cy.getBySel("forgot-error").should("be.visible");

    cy.stubApi("POST", "/auth/verify-recovery-code", {
      body: {},
      delay: 500,
    });
    cy.getBySel("forgot-submit").click();
    cy.getBySel("forgot-error").should("not.exist");
    cy.getBySel("probe-path").should("have.text", "/reset-password");
  });

  it("has no accessibility violations", () => {
    mountPage();
    cy.checkA11yAA();
  });
});
