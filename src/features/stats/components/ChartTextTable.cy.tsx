import { ChartTextTable } from "./ChartTextTable";
import { shouldHaveTable } from "../../../../cypress/support/routes/stats";

describe("<ChartTextTable />", () => {
  beforeEach(() => {
    cy.mount(
      <section>
        <h2 id="chart-heading">Attendance per event</h2>
        <ChartTextTable
          labelledBy="chart-heading"
          headers={["Event", "Attended"]}
          rows={[
            { key: "m1", cells: ["Alter March", "80"] },
            { key: "m2", cells: ["Alter April", "70"] },
          ]}
        />
      </section>,
    );
  });

  it("lists a chart's numbers in a table named after its heading", () => {
    shouldHaveTable("Attendance per event", [
      ["Event", "Attended"],
      ["Alter March", "80"],
      ["Alter April", "70"],
    ]);
    cy.getByRole("rowheader").should("have.length", 2);
    cy.getByRole("columnheader").each(($th) =>
      expect($th).to.have.attr("scope", "col"),
    );
  });

  it("is for screen readers only, without widening the page", () => {
    // sr-only sits on the wrapper: a table sizes to its content.
    cy.getByRole("table", { name: "Attendance per event" })
      .should("not.have.class", "sr-only")
      .parent()
      .should("have.class", "sr-only")
      .and("have.css", "width", "1px");
  });

  it("has no accessibility violations", () => {
    cy.checkA11yAA();
  });
});
