import { EventTypeFilter } from "./EventTypeFilter";

describe("<EventTypeFilter />", () => {
  it("shows the chosen type and reports a new one", () => {
    cy.mount(
      <EventTypeFilter value="BAN" onChange={cy.spy().as("onChange")} />,
    );
    cy.getBySel("events-type-filter-value").should("have.text", "Vant");
    cy.getByRole("combobox", { name: "Type", native: false }).click();
    cy.getByRole("option", { name: "Walk-in", native: false }).click();
    cy.get("@onChange").should("have.been.calledOnceWith", "WALKIN");
  });

  it("opens with the keyboard", () => {
    cy.mount(
      <EventTypeFilter value="all" onChange={cy.spy().as("onChange")} />,
    );
    cy.getByRole("combobox", { name: "Type", native: false }).focus();
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.getByRole("listbox", { native: false }).should("be.visible");
    cy.checkA11yAA();
  });
});
