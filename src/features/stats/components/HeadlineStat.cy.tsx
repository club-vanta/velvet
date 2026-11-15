import { HeadlineStat } from "./HeadlineStat";
import { shouldShowHeadline } from "../../../../cypress/support/routes/stats";

describe("<HeadlineStat />", () => {
  it("shows the number with its context and comparison", () => {
    cy.mount(
      <HeadlineStat
        data-cy="stats-headline-attended"
        label="Attended"
        value="412"
        subline="Alter Night · 23:15"
        comparison="+8% compared with the previous period"
        n={412}
      />,
    );
    shouldShowHeadline("attended", {
      label: "Attended",
      value: "412",
      subline: "Alter Night · 23:15",
      comparison: "+8% compared with the previous period",
      sample: null,
    });
    cy.getBySel("stats-headline-attended").should(
      "not.have.class",
      "text-muted-foreground",
    );
  });

  it("leaves out the lines it was not given", () => {
    cy.mount(
      <HeadlineStat data-cy="stats-headline-events" label="Events" value="5" />,
    );
    shouldShowHeadline("events", {
      value: "5",
      subline: null,
      comparison: null,
      sample: null,
    });
  });

  it("dims a number computed from fewer than 10 people and shows n", () => {
    cy.mount(
      <HeadlineStat
        data-cy="stats-headline-no-show"
        label="No-show"
        value="14%"
        n={7}
      />,
    );
    cy.getBySel("stats-headline-no-show").should(
      "have.class",
      "text-muted-foreground",
    );
    shouldShowHeadline("no-show", { sample: "n = 7" });
  });

  it("does not dim a number from 10 people or more", () => {
    cy.mount(
      <HeadlineStat
        data-cy="stats-headline-no-show"
        label="No-show"
        value="10%"
        n={10}
      />,
    );
    shouldShowHeadline("no-show", { sample: null });
  });

  it("has no accessibility violations, dimmed included", () => {
    cy.mount(
      <div className="grid grid-cols-2 gap-2">
        <HeadlineStat data-cy="stats-headline-a" label="Attended" value="412" />
        <HeadlineStat
          data-cy="stats-headline-b"
          label="No-show"
          value="14%"
          comparison="+3 points compared with the previous period"
          n={7}
        />
      </div>,
    );
    cy.checkA11yAA();
  });
});
