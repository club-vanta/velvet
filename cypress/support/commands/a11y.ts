// Automated accessibility scans with cypress-axe (axe-core). The docs advise
// scanning once per page or workflow state, scoped where possible, and pairing
// scans with explicit assertions (cy.getByRole, keyboard navigation).
import "cypress-axe";
import type { Result } from "axe-core";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Fails on WCAG 2.1 A/AA violations inside `context` (default: page). */
      checkA11yAA(context?: string): Chainable<void>;
    }
  }
}

function logViolations(violations: Result[]) {
  cy.task(
    "table",
    violations.map(({ id, impact, description, nodes }) => ({
      id,
      impact,
      description,
      nodes: nodes.length,
    })),
    { log: false },
  );
}

Cypress.Commands.add("checkA11yAA", (context) => {
  cy.injectAxe();
  cy.checkA11y(
    context,
    {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    },
    logViolations,
  );
});

export {};
