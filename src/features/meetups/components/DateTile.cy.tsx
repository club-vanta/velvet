import { DateTile } from "./DateTile";

// Noon, so the day is the same in every time zone the suite runs in.
const DATE = "2026-10-21T12:00:00Z";

describe("<DateTile />", () => {
  // CSS lowercases the month on screen; the text node keeps the locale case.
  it("shows the month and the day, hidden from screen readers", () => {
    cy.mount(
      <div data-cy="tile">
        <DateTile date={DATE} timing="upcoming" />
      </div>,
    );
    cy.getBySel("tile")
      .children()
      .should("have.attr", "aria-hidden", "true")
      .and("have.text", "Oct21");
  });

  it("names the month in Spanish", () => {
    cy.mount(
      <div data-cy="tile">
        <DateTile date="2026-08-21T12:00:00Z" timing="past" size="lg" />
      </div>,
      { lang: "es" },
    );
    cy.getBySel("tile").should("have.text", "ago21");
  });
});
