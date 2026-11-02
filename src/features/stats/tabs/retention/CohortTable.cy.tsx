import { CohortTable } from "./CohortTable";
import { makeCohortRow } from "@/tests/factories";
import type { Schema } from "@/tests/factories";

const COHORTS = [
  makeCohortRow({ month: "2026-01", size: 40, retention: [0.5, 0.25, 0, 1] }),
  makeCohortRow({ month: "2026-02", size: 4, retention: [0.25] }),
];

function mountTable(cohorts: Schema<"CohortRowPublic">[] = COHORTS) {
  cy.mount(
    <section>
      <h2 id="cohorts-heading">Cohortes</h2>
      <CohortTable cohorts={cohorts} labelledBy="cohorts-heading" />
    </section>,
    { lang: "es" },
  );
}

const tint = (pct: number) =>
  `color-mix(in oklch, var(--chart-2) ${pct}%, transparent)`;

describe("<CohortTable />", () => {
  it("is named by its heading and has a column per month after the first", () => {
    mountTable();
    cy.getByRole("table", { name: "Cohortes" })
      .getByRole("columnheader")
      .should(($th) => {
        expect($th.toArray().map((th) => th.textContent)).to.deep.equal([
          "Primer mes",
          "Personas",
          ...Array.from({ length: 12 }, (_, i) => `+${i + 1}`),
        ]);
        for (const th of $th.toArray()) {
          expect(th).to.have.attr("scope", "col");
        }
      });
  });

  it("labels each row by its month and shows its size and shares", () => {
    mountTable();
    cy.getBySel("stats-cohort-2026-01").within(() => {
      cy.getByRole("rowheader").should("have.text", "ene 2026");
      cy.getBySel("stats-cohort-size").should("have.text", "40");
      cy.getBySel("stats-cohort-retention").should(($cells) => {
        expect($cells.toArray().map((c) => c.textContent)).to.deep.equal([
          "50%",
          "25%",
          "0%",
          "100%",
          ...Array.from({ length: 8 }, () => ""),
        ]);
      });
    });
  });

  it("tints each share by its value, capped so the text keeps its contrast", () => {
    mountTable();
    cy.getBySel("stats-cohort-2026-01")
      .findBySel("stats-cohort-retention")
      .should(($cells) => {
        expect(
          $cells
            .toArray()
            .slice(0, 5)
            .map((c) => c.style.backgroundColor),
        ).to.deep.equal([tint(25), tint(13), tint(0), tint(50), ""]);
      });
  });

  it("dims a cohort of fewer than 10 people without a tint", () => {
    mountTable();
    cy.getBySel("stats-cohort-2026-02")
      .should("have.class", "text-muted-foreground")
      .within(() => {
        // Its size is already in the Personas column, so no "n =".
        cy.getByRole("rowheader").should("have.text", "feb 2026");
        cy.getBySel("stats-cohort-size").should("have.text", "4");
        cy.getBySel("stats-cohort-retention")
          .first()
          .should("have.text", "25%")
          .and(($cell) => expect($cell[0]!.style.backgroundColor).to.equal(""));
      });
    cy.getBySel("stats-cohort-2026-01").should(
      "not.have.class",
      "text-muted-foreground",
    );
  });

  it("keeps the month column in view while the shares scroll sideways", () => {
    mountTable();
    cy.getByRole("columnheader", { name: "Primer mes" })
      .should("have.css", "position", "sticky")
      .and("have.css", "left", "0px");
    cy.getByRole("rowheader").each(($th) => {
      cy.wrap($th)
        .should("have.css", "position", "sticky")
        .and("have.css", "left", "0px");
    });
    cy.getByRole("table", { name: "Cohortes" })
      .parent()
      .should("have.css", "overflow-x", "auto");
  });

  it("formats the cohort size for the locale", () => {
    mountTable([
      makeCohortRow({ month: "2026-01", size: 12000, retention: [] }),
    ]);
    cy.getBySel("stats-cohort-2026-01")
      .findBySel("stats-cohort-size")
      .should("have.text", "12.000");
  });

  it("has no accessibility violations", () => {
    mountTable();
    cy.checkA11yAA();
  });
});
