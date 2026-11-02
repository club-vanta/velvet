import { StatsListMore } from "./StatsListMore";

describe("<StatsListMore />", () => {
  it("says how many entries the list leaves out, in the locale's digits", () => {
    cy.mount(<StatsListMore count={12000} data-cy="stats-bans-more" />, {
      lang: "es",
    });
    cy.getBySel("stats-bans-more").should("have.text", "y 12.000 más");
  });

  it("says nothing when the list is complete", () => {
    cy.mount(
      <div data-cy="list">
        <StatsListMore count={0} data-cy="stats-bans-more" />
      </div>,
    );
    cy.getBySel("list").should("be.empty");
  });
});
