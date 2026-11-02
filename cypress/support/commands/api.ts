// Typed API stubs. Paths and payloads come from the generated OpenAPI types,
// so a stub with the wrong shape fails the typecheck, the same way the app
// would fail to compile against a changed backend.
//
//   cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
//     body: { total: 1, meetups: [makeMeetup()] },
//   }).as("getMeetups");
//
// Path parameters match any value unless `params` pins them.
import type { paths } from "../../../src/api/types";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Op<P extends keyof paths, M extends Method> = paths[P][Lowercase<M>];

/** API paths that implement `M`. */
export type ApiPath<M extends Method> = {
  [P in keyof paths]: Op<P, M> extends { responses: unknown } ? P : never;
}[keyof paths];

type Json<R> = R extends { content: { "application/json": infer B } }
  ? B
  : undefined;
type Responses<P extends keyof paths, M extends Method> =
  Op<P, M> extends { responses: infer R } ? R : never;

/** The success (2xx) body of `M path`. */
export type ApiBody<P extends keyof paths, M extends Method> =
  Responses<P, M> extends infer R
    ? R extends Record<200, unknown>
      ? Json<R[200]>
      : R extends Record<201, unknown>
        ? Json<R[201]>
        : undefined
    : never;

type PathParams<P extends string> =
  P extends `${string}{${infer Param}}${infer Rest}`
    ? Param | PathParams<Rest>
    : never;

export type StubOptions<P extends keyof paths, M extends Method> = {
  body: ApiBody<P, M>;
  statusCode?: number;
  /** Pin path parameters, e.g. `{ meetup_id: "m-1" }`. */
  params?: Partial<Record<PathParams<P & string>, string>>;
  /** Milliseconds before the response, to test loading states. */
  delay?: number;
};

export type StubErrorOptions<P extends keyof paths> = {
  statusCode: number;
  /** FastAPI's error message, shown by the app as is. */
  detail?: string;
  params?: Partial<Record<PathParams<P & string>, string>>;
  /** Fail at the network level instead (offline, DNS, CORS). */
  forceNetworkError?: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Answers `method path` on the API with a typed success body. */
      stubApi<M extends Method, P extends ApiPath<M>>(
        method: M,
        path: P,
        options: StubOptions<P, M>,
      ): Chainable<null>;
      /** Answers `method path` on the API with an error. */
      stubApiError<M extends Method, P extends ApiPath<M>>(
        method: M,
        path: P,
        options: StubErrorOptions<P>,
      ): Chainable<null>;
    }
  }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function apiUrl(): string {
  return String(Cypress.expose("apiUrl"));
}

/** A matcher for `path` on the API host, with `{param}` as a wildcard. */
export function apiUrlPattern(
  path: string,
  params: Record<string, string | undefined> = {},
): RegExp {
  const source = path
    .split(/(\{[^}]+\})/)
    .map((part) => {
      const name = part.match(/^\{([^}]+)\}$/)?.[1];
      if (!name) return escapeRegExp(part);
      const pinned = params[name];
      return pinned ? escapeRegExp(encodeURIComponent(pinned)) : "[^/?#]+";
    })
    .join("");
  return new RegExp(`^${escapeRegExp(apiUrl())}${source}(\\?.*)?$`);
}

Cypress.Commands.add(
  "stubApi",
  (method: Method, path: string, options: StubOptions<keyof paths, Method>) =>
    cy.intercept(
      { method, url: apiUrlPattern(path, options.params) },
      {
        statusCode: options.statusCode ?? 200,
        body: options.body ?? "",
        delay: options.delay,
      },
    ),
);

Cypress.Commands.add(
  "stubApiError",
  (method: Method, path: string, options: StubErrorOptions<keyof paths>) =>
    cy.intercept(
      { method, url: apiUrlPattern(path, options.params) },
      options.forceNetworkError
        ? { forceNetworkError: true }
        : {
            statusCode: options.statusCode,
            body: { detail: options.detail ?? "Error" },
          },
    ),
);

/**
 * Fails the test on any API request no test stubbed. Registered first in
 * every test, so the stubs a test adds afterwards take precedence (Cypress
 * matches the most recently defined intercept first).
 */
export function failOnUnstubbedApiRequests(): void {
  if (Cypress.expose("realBackend")) return;
  cy.intercept({ url: new RegExp(`^${escapeRegExp(apiUrl())}/`) }, (req) => {
    throw new Error(
      `Unstubbed API request: ${req.method} ${req.url}. Stub it with cy.stubApi().`,
    );
  });
}
