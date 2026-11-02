import { StatCard } from "./StatCard";

describe("<StatCard />", () => {
  it("is named by its heading when the heading has an id", () => {
    cy.mount(
      <StatCard title="Cohorts" headingId="cohorts-heading" heading="caption">
        <p>body</p>
      </StatCard>,
    );
    cy.getByRole("region", { name: "Cohorts" }).should(
      "have.attr",
      "aria-labelledby",
      "cohorts-heading",
    );
    cy.getByRole("region", { name: "Cohorts" }).should(
      "not.have.attr",
      "aria-label",
    );
    cy.getByRole("heading", { name: "Cohorts" })
      .should("match", "h2")
      .and("have.attr", "id", "cohorts-heading");
  });

  it("is named by its title without a heading id", () => {
    cy.mount(
      <StatCard title="Payments" data-cy="payments-card">
        <p>body</p>
      </StatCard>,
    );
    cy.getBySel("payments-card").should("have.attr", "aria-label", "Payments");
    cy.getBySel("payments-card").should("not.have.attr", "aria-labelledby");
    cy.getByRole("region", { name: "Payments" }).should("be.visible");
  });

  it("has no accessibility violations", () => {
    cy.mount(
      <StatCard title="Payments">
        <p>body</p>
      </StatCard>,
    );
    cy.checkA11yAA();
  });
});
