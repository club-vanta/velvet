import { PendingBadge } from "./PendingBadge";

describe("<PendingBadge />", () => {
  it("renders nothing without pending approvals", () => {
    cy.mount(
      <div data-cy="host">
        <PendingBadge count={0} />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("shows the count and names it for screen readers", () => {
    cy.mount(<PendingBadge count={3} />);
    cy.getBySel("shell-pending-badge")
      .should("be.visible")
      .and("have.text", "Pending approvals: 3");
  });

  it("names it in Spanish in the Spanish UI", () => {
    cy.mount(<PendingBadge count={1} />, { lang: "es" });
    cy.getBySel("shell-pending-badge").should(
      "have.text",
      "Aprobaciones pendientes: 1",
    );
  });

  it("has no accessibility violations", () => {
    cy.mount(<PendingBadge count={3} />);
    cy.checkA11yAA();
  });
});
