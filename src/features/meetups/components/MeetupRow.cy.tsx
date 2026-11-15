import { makeMeetup } from "@/tests/factories";
import { MeetupRow } from "./MeetupRow";

function inDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(22, 0, 0, 0);
  return d.toISOString();
}

function mount(meetup = makeMeetup({ id: "m-1", date: inDays(3) })) {
  cy.mount(
    <ul className="@container" data-cy="list">
      <MeetupRow meetup={meetup} />
    </ul>,
  );
}

describe("<MeetupRow />", () => {
  it("links the name to the meetup and says how far away it is", () => {
    mount();
    cy.getBySel("meetup-row-m-1").within(() => {
      cy.getByRole("link", { name: "Alter Night" }).should(
        "have.attr",
        "href",
        "/meetups/m-1",
      );
      cy.getBySel("meetup-when").should("contain.text", "(in 3 days)");
    });
  });

  it("leaves the relative day to the Today badge", () => {
    mount(makeMeetup({ id: "m-1", date: inDays(0) }));
    cy.getBySel("meetup-badge-today").should("have.text", "Today");
    cy.getBySel("meetup-when").should("not.contain.text", "(");
  });

  it("keeps the Mazmo link apart from the row link, by keyboard too", () => {
    mount();
    cy.getBySel("meetup-link").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "meetup-mazmo-link");
    cy.checkA11yAA('[data-cy="list"]');
  });
});
