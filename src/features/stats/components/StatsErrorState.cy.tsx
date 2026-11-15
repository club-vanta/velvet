import { StatsErrorState } from "./StatsErrorState";

describe("<StatsErrorState />", () => {
  it("announces the failure and retries on request", () => {
    cy.mount(<StatsErrorState onRetry={cy.spy().as("onRetry")} />);
    cy.getByRole("alert").should(
      "contain.text",
      "Could not load the statistics.",
    );
    cy.getBySel("stats-show-all").should("not.exist");
    cy.getByRole("button", { name: "Retry" }).click();
    cy.get("@onRetry").should("have.been.calledOnce");
  });

  it("offers a way back to all events for one event", () => {
    cy.mount(
      <StatsErrorState
        onRetry={cy.spy().as("onRetry")}
        onShowAll={cy.spy().as("onShowAll")}
      />,
    );
    cy.getByRole("button", { name: "See all events" }).click();
    cy.get("@onShowAll").should("have.been.calledOnce");
    cy.get("@onRetry").should("not.have.been.called");
  });

  it("reaches both actions with the keyboard", () => {
    cy.mount(
      <StatsErrorState
        onRetry={cy.spy().as("onRetry")}
        onShowAll={cy.spy().as("onShowAll")}
      />,
    );
    cy.getBySel("stats-retry").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "stats-show-all");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.get("@onShowAll").should("have.been.calledOnce");
  });

  it("has no accessibility violations", () => {
    cy.mount(<StatsErrorState onRetry={() => {}} onShowAll={() => {}} />);
    cy.checkA11yAA();
  });
});
