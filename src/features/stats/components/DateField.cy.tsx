import { DateField } from "./DateField";

describe("<DateField />", () => {
  beforeEach(() => {
    cy.mount(
      <DateField
        data-cy="stats-range-from"
        label="From"
        value="2026-03-01"
        max="2026-03-31"
        onChange={cy.spy().as("onChange")}
      />,
    );
  });

  it("is a date input named by its label, bounded by the other date", () => {
    cy.getBySel("stats-range-from")
      .should("have.attr", "type", "date")
      .and("have.value", "2026-03-01")
      .and("have.attr", "max", "2026-03-31")
      .and(($input) => {
        const labels = ($input[0] as HTMLInputElement).labels!;
        expect(Array.from(labels, (l) => l.textContent)).to.deep.equal([
          "From",
        ]);
      });
  });

  it("reports a picked day", () => {
    cy.getBySel("stats-range-from").type("2026-03-05");
    cy.get("@onChange").should("have.been.calledWith", "2026-03-05");
  });

  it("ignores a cleared field, which would leave the range without a day", () => {
    cy.getBySel("stats-range-from").clear();
    cy.get("@onChange").should("not.have.been.called");
  });
});
