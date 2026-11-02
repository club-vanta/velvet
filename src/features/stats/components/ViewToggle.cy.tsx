import { ViewToggle } from "./ViewToggle";

const OPTIONS = [
  { value: "rate", label: "Rate" },
  { value: "share", label: "Share" },
] as const;

describe("<ViewToggle />", () => {
  beforeEach(() => {
    cy.mount(
      <ViewToggle
        data-cy="stats-view"
        label="Show"
        options={OPTIONS}
        value="rate"
        onChange={cy.spy().as("onChange")}
      />,
    );
  });

  it("names the group and presses the current view", () => {
    cy.getByRole("group", { name: "Show", native: false }).should(
      "have.attr",
      "data-cy",
      "stats-view",
    );
    cy.getByRole("button", { name: "Rate" }).should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    cy.getByRole("button", { name: "Share" }).should(
      "have.attr",
      "aria-pressed",
      "false",
    );
  });

  it("asks for the view that is clicked", () => {
    cy.getBySel("stats-view-share").click();
    cy.get("@onChange").should("have.been.calledOnceWith", "share");
  });

  it("switches with the keyboard", () => {
    cy.getBySel("stats-view-rate").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "stats-view-share");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.get("@onChange").should("have.been.calledOnceWith", "share");
  });

  it("has no accessibility violations", () => {
    cy.checkA11yAA();
  });
});
