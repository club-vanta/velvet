import { RateBars, type RateRow } from "./RateBars";
import { waitForAnimations } from "../../../../../cypress/support/routes/stats";

const ROWS: RateRow[] = [
  { key: "MALE", label: "Man", rate: 0.1, n: 50 },
  { key: "NEW_CODE", label: "NEW_CODE", rate: 0.5, n: 4 },
  { key: "null", label: "Unknown", rate: null, n: 0 },
];

function mountBars(dimSmallSamples?: boolean) {
  cy.mount(
    <section>
      <h2 id="gender-heading">By gender</h2>
      <RateBars
        rows={ROWS}
        groupHeader="Group"
        rateHeader="No-show"
        labelledBy="gender-heading"
        dimSmallSamples={dimSmallSamples}
      />
    </section>,
  );
}

describe("<RateBars />", () => {
  it("draws each rate as a bar of its length, with the number beside it", () => {
    mountBars();
    cy.getByRole("table", { name: "By gender" })
      .getByRole("columnheader")
      .should(($th) => {
        expect($th.toArray().map((th) => th.textContent)).to.deep.equal([
          "Group",
          "No-show",
        ]);
      });
    cy.getBySel("stats-rate-row-MALE").within(() => {
      cy.getBySel("stats-rate-group").should("have.text", "Man");
      cy.getBySel("stats-rate-value").should("have.text", "10%");
      cy.getBySel("stats-rate-bar")
        .should("have.attr", "style")
        .and("contain", "width: 10%");
    });
  });

  it("shows a dash and no bar for a missing rate", () => {
    mountBars();
    cy.getBySel("stats-rate-row-null").within(() => {
      cy.getBySel("stats-rate-value").should("have.text", "–");
      cy.getBySel("stats-rate-bar").should("not.exist");
      cy.getBySel("stats-rate-sample").should("not.exist");
    });
  });

  it("dims a rate from few people and shows its n", () => {
    mountBars();
    cy.getBySel("stats-rate-row-NEW_CODE")
      .should("have.class", "text-muted-foreground")
      .findBySel("stats-rate-sample")
      .should("have.text", "n = 4");
    cy.getBySel("stats-rate-row-MALE")
      .should("not.have.class", "text-muted-foreground")
      .findBySel("stats-rate-sample")
      .should("not.exist");
  });

  it("does not dim exact counts", () => {
    mountBars(false);
    cy.getBySel("stats-rate-row-NEW_CODE")
      .should("not.have.class", "text-muted-foreground")
      .findBySel("stats-rate-sample")
      .should("not.exist");
  });

  it("has no accessibility violations", () => {
    mountBars();
    cy.getBySel("stats-rate-row-MALE").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
