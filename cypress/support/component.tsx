// Runs before every component spec. cy.mount() wraps the component in the
// same providers the app uses (src/main.tsx and src/app/App.tsx), so a
// component behaves as it does on its page.
import "@cypress/code-coverage/support";
import "../../src/index.css";
import "./commands";
import type { ReactNode } from "react";
import { mount, type MountOptions, type MountReturn } from "cypress/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "../../src/lib/i18n";
import { AuthProvider, OrgProvider } from "../../src/domain/session";
import { ORG_ID, USERS, type Role } from "../../src/tests/factories";
import { failOnUnstubbedApiRequests } from "./commands/api";
import { stubSessionRequests } from "./commands/session";

type Lang = "en" | "es";

export type AppMountOptions = MountOptions & {
  /** UI language (default English). */
  lang?: Lang;
  /** Signs in as this role first, so useAuth()/useOrg() have a user. */
  as?: Role;
  /** The URL the component renders at (default "/"). */
  path?: string;
  /** A route pattern such as "/meetups/:id" when the component reads params. */
  route?: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Mounts `component` inside the app's providers. */
      mount(
        component: ReactNode,
        options?: AppMountOptions,
      ): Chainable<MountReturn>;
    }
  }
}

Cypress.Commands.add(
  "mount",
  (component: ReactNode, options: AppMountOptions = {}) => {
    const { lang = "en", as, path = "/", route, ...mountOptions } = options;
    window.localStorage.setItem("lang", lang);
    if (as) {
      window.localStorage.setItem("auth_token", `stub-token-${as}`);
      window.localStorage.setItem("active_org_id", ORG_ID);
      stubSessionRequests(USERS[as]);
    } else {
      cy.stubApiError("GET", "/auth/userinfo", { statusCode: 401 });
    }

    // A fresh client per test: no cache leaks between tests, no retries.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const routed = route ? (
      <Routes>
        <Route path={route} element={component} />
      </Routes>
    ) : (
      component
    );
    return mount(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <LanguageProvider>
            <AuthProvider>
              <OrgProvider>{routed}</OrgProvider>
            </AuthProvider>
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
      mountOptions,
    );
  },
);

beforeEach(() => {
  failOnUnstubbedApiRequests();
});
