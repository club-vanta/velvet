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

/**
 * Waits for the page's finite animations to end, so axe reads final colors and
 * not a frame of a fade-in (a half-faded label fails contrast). Endless ones,
 * such as spinners, are left alone. Chrome creates a CSS animation on the
 * next frame, so wait two frames first: right after a render the list can
 * still be empty while the element sits at its starting opacity.
 */
function waitForAnimations() {
  cy.window({ log: false }).then(
    (win) =>
      new Cypress.Promise<void>((resolve) =>
        win.requestAnimationFrame(() =>
          win.requestAnimationFrame(() => resolve()),
        ),
      ),
  );
  cy.document({ log: false }).should((doc) => {
    const running = doc
      .getAnimations()
      .filter(
        (a) =>
          a.playState === "running" &&
          a.effect?.getComputedTiming().endTime !== Infinity,
      );
    expect(running, "running animations").to.have.length(0);
  });
}

Cypress.Commands.add("checkA11yAA", (context) => {
  waitForAnimations();
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
