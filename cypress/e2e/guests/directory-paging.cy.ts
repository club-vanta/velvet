import { manyGuests, stubGuestsPage } from "../../support/routes/guests";

// 1050 guests: ten full pages of 100 and a last one of 50.
const GUESTS = manyGuests(1050);

function scrollToShowMore() {
  cy.getBySel("list-show-more").scrollIntoView();
}

describe("Guest directory paging", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubGuestsPage({ guests: GUESTS });
    cy.visit("/guests");
    cy.wait("@getGuests");
  });

  it("renders the first 100 guests and loads the next page when scrolled near", () => {
    cy.getBySelLike("guest-row-").should("have.length", 100);
    cy.getBySel("list-show-more").should("have.text", "Show 100 more");

    scrollToShowMore();

    cy.getBySelLike("guest-row-").should("have.length", 200);
    cy.getBySel("guest-row-guest-0199").should("exist");
  });

  it("keeps loading until every guest is shown, the last page being shorter", () => {
    Cypress._.times(9, (page) => {
      scrollToShowMore();
      cy.getBySelLike("guest-row-").should("have.length", (page + 2) * 100);
    });
    cy.getBySel("list-show-more").should("have.text", "Show 50 more");

    scrollToShowMore();

    cy.getBySelLike("guest-row-").should("have.length", 1050);
    cy.getBySel("list-show-more").should("not.exist");
  });

  it("starts again from the first page when the search changes", () => {
    scrollToShowMore();
    cy.getBySelLike("guest-row-").should("have.length", 200);

    // Every guest matches, so only the reset to one page is left to see.
    cy.getBySel("list-search").type("guest");

    cy.getBySel("list-count").should("have.text", "Showing 1050 of 1050");
    cy.getBySelLike("guest-row-").should("have.length", 100);
  });

  it("starts again from the first page when the sort changes", () => {
    scrollToShowMore();
    cy.getBySelLike("guest-row-").should("have.length", 200);

    cy.getBySel("list-sort").click();
    cy.getByRole("menuitemradio", { name: "Z to A" }).click();
    cy.press(Cypress.Keyboard.Keys.ESC);

    cy.getBySelLike("guest-row-").should("have.length", 100);
    cy.getBySelLike("guest-row-")
      .first()
      .should("have.attr", "data-cy", "guest-row-guest-1049");
  });
});
