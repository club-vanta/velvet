import { Fact, FactStrip } from "./FactStrip";

describe("<FactStrip />", () => {
  beforeEach(() => {
    cy.mount(
      <div className="@container w-[600px]">
        <FactStrip cols={2}>
          <Fact label="Age" data-cy="fact-age">
            31 years
          </Fact>
          <Fact label="Arrived" hint="80% of RSVPs" data-cy="fact-arrived">
            40
          </Fact>
        </FactStrip>
      </div>,
    );
  });

  it("shows each fact's label, value and hint as a description list", () => {
    cy.getByRole("term").should(($terms) => {
      expect($terms.toArray().map((el) => el.textContent)).to.deep.equal([
        "Age",
        "Arrived",
      ]);
    });
    cy.getBySel("fact-age-value").should("have.text", "31 years");
    cy.getBySel("fact-arrived-value").should("have.text", "40");
    cy.getBySel("fact-arrived").should("contain.text", "80% of RSVPs");
    cy.getBySel("fact-age").getByRole("definition").should("have.length", 1);
  });

  it("has no accessibility violations", () => {
    cy.checkA11yAA();
  });
});
