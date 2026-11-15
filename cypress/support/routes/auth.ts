// Stubs and steps shared by the signed-out specs (login, signup, recovery).

type Lang = "en" | "es";

/** Opens `path` signed out: there is no session to restore. */
export function visitSignedOut(path: string, lang: Lang = "en"): void {
  cy.stubApiError("GET", "/auth/userinfo", { statusCode: 401 });
  cy.visit(path, {
    onBeforeLoad: (win) => win.localStorage.setItem("lang", lang),
  });
}

/** The `<label>` of the field `selector`, as a screen reader names it. */
export function expectFieldLabel(selector: string, text: string): void {
  cy.getBySel(selector).should(($field) => {
    const field = $field[0] as HTMLInputElement;
    expect(field.labels?.[0]?.textContent).to.equal(text);
  });
}

/** The hint tied to the field `selector` with aria-describedby. */
export function expectFieldHint(selector: string, text: string): void {
  cy.getBySel(selector).should(($field) => {
    const hintId = $field.attr("aria-describedby") ?? "";
    const hint = $field[0].ownerDocument.getElementById(hintId);
    expect(hint?.textContent).to.equal(text);
  });
}

/**
 * Verifies a recovery code on /forgot-password, which lands on
 * /reset-password with the username and code in the router state (the only
 * way to open that page).
 */
export function openResetPassword(
  username = "alice",
  code = "123456",
  lang: Lang = "en",
): void {
  visitSignedOut("/forgot-password", lang);
  cy.stubApi("POST", "/auth/verify-recovery-code", { body: {} }).as(
    "verifyCode",
  );
  cy.getBySel("forgot-username").type(username);
  cy.getBySel("forgot-code").type(code);
  cy.getBySel("forgot-submit").click();
  cy.wait("@verifyCode");
  cy.location("pathname").should("eq", "/reset-password");
}
