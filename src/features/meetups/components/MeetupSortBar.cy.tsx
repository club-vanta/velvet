import type { MeetupSort } from "../lib/meetupListSort";
import { MeetupSortBar } from "./MeetupSortBar";

function mount(sort: MeetupSort) {
  cy.mount(
    <div data-cy="bar">
      <MeetupSortBar sort={sort} onSort={cy.spy().as("onSort")} />
    </div>,
  );
}

describe("<MeetupSortBar />", () => {
  it("presses neither button with no sort picked", () => {
    mount(null);
    cy.getBySel("meetups-sort-name").should(
      "have.attr",
      "aria-pressed",
      "false",
    );
    cy.getBySel("meetups-sort-date").should(
      "have.attr",
      "aria-pressed",
      "false",
    );
  });

  it("presses the active column", () => {
    mount({ col: "date", dir: "desc" });
    cy.getBySel("meetups-sort-date").should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    cy.getBySel("meetups-sort-name").should(
      "have.attr",
      "aria-pressed",
      "false",
    );
  });

  it("asks to sort by the clicked column", () => {
    mount(null);
    cy.getByRole("button", { name: "Name" }).click();
    cy.get("@onSort").should("have.been.calledOnceWith", "name");
  });

  it("is reachable by keyboard and accessible", () => {
    mount(null);
    cy.getBySel("meetups-sort-name").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "meetups-sort-date");
    cy.checkA11yAA('[data-cy="bar"]');
  });
});
