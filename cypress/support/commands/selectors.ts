// data-cy selectors, as the Cypress best-practices guide recommends: they are
// only for tests, so styling, markup or copy changes do not break specs.
// Prefer cy.getByRole() (built in) when the element has a stable role and
// accessible name that the test should also guard.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** `[data-cy="<selector>"]` anywhere in the page. */
      getBySel(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
      /** `[data-cy^="<prefix>"]`: rows such as `guest-row-<id>`. */
      getBySelLike(
        prefix: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
      /** `[data-cy="<selector>"]` inside the previous subject. */
      findBySel(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Shadow>,
      ): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add("getBySel", (selector, options) =>
  cy.get(`[data-cy="${selector}"]`, options),
);

Cypress.Commands.add("getBySelLike", (prefix, options) =>
  cy.get(`[data-cy^="${prefix}"]`, options),
);

Cypress.Commands.add(
  "findBySel",
  { prevSubject: "element" },
  (subject: JQuery<HTMLElement>, selector: string, options) =>
    cy.wrap(subject, { log: false }).find(`[data-cy="${selector}"]`, options),
);

export {};
