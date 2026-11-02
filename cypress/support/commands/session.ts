// Programmatic login, as the Cypress docs recommend: the login form has its
// own spec (e2e/auth/login.cy.ts); every other spec starts signed in.
//
// Stubbed runs cache the browser storage with cy.session() and answer the
// session requests the Shell makes on every page. Smoke runs log in against
// the real backend with cy.request().
import {
  ORG_ID,
  USERS,
  makeOrg,
  type Role,
} from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";
import { apiUrl } from "./api";

type Lang = "en" | "es";

export type LoginOptions = {
  /** UI language. Specs default to English; one spec covers Spanish. */
  lang?: Lang;
  /** Replace the stubbed user, e.g. to change memberships. */
  user?: Schema<"UserPublic">;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Signs in as `role` (stubbed backend). Call before cy.visit(). */
      loginAs(role: Role, options?: LoginOptions): Chainable<null>;
      /** Signs in against the real backend (smoke suite only). */
      loginWithPassword(username: string, password: string): Chainable<null>;
    }
  }
}

const TOKEN_KEY = "auth_token";

function seedStorage(token: string, lang: Lang) {
  cy.window().then((win) => {
    win.localStorage.setItem(TOKEN_KEY, token);
    win.localStorage.setItem("lang", lang);
    win.localStorage.setItem("active_org_id", ORG_ID);
  });
}

/**
 * Answers the requests every signed-in page makes: who am I, and for site
 * admins the organization list and the pending-staff badge. Later stubs in a
 * test take precedence, so a spec can still override any of them.
 */
export function stubSessionRequests(user: Schema<"UserPublic">): void {
  cy.stubApi("GET", "/auth/userinfo", { body: user }).as("userinfo");
  if (user.role.name === "SITE_ADMIN") {
    cy.stubApi("GET", "/organizations/", {
      body: { total: 1, organizations: [makeOrg()] },
    });
    cy.stubApi("GET", "/staff/pending", { body: [] });
  }
}

Cypress.Commands.add("loginAs", (role, { lang = "en", user } = {}) => {
  cy.session(
    ["stub", role, lang],
    () => {
      cy.stubApiError("GET", "/auth/userinfo", { statusCode: 401 });
      cy.visit("/");
      seedStorage(`stub-token-${role}`, lang);
    },
    { cacheAcrossSpecs: true },
  );
  // Intercepts reset before every test, so these are added each time.
  stubSessionRequests(user ?? USERS[role]);
  return cy.wrap(null, { log: false });
});

Cypress.Commands.add("loginWithPassword", (username, password) => {
  cy.session(
    ["real", username],
    () => {
      cy.visit("/");
      cy.request({
        method: "POST",
        url: `${apiUrl()}/auth/token`,
        form: true,
        body: { username, password },
      }).then(({ body }) => seedStorage(body.access_token, "en"));
    },
    {
      cacheAcrossSpecs: true,
      // The spec window shares the app's origin, so it sees the restored token.
      validate() {
        cy.request({
          url: `${apiUrl()}/auth/userinfo`,
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem(TOKEN_KEY)}`,
          },
        })
          .its("status")
          .should("eq", 200);
      },
    },
  );
  return cy.wrap(null, { log: false });
});

export {};
