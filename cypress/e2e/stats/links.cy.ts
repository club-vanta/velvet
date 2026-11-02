import {
  stubGuestPage,
  stubNoShows,
  stubOperations,
  stubRetention,
  visitStats,
} from "../../support/routes/stats";

/** Each stats list that links to a guest: its tab, its row and the guest. */
const LINKS = [
  {
    list: "who keeps missing events",
    tab: "no-shows",
    stub: stubNoShows,
    row: "stats-noshow-guest-guest-2",
    guest: ["guest-2", "Tomi"],
  },
  {
    list: "the newest bans",
    tab: "operations",
    stub: stubOperations,
    row: "stats-ban-guest-1",
    guest: ["guest-1", "Ana"],
  },
  {
    list: "the regulars who stopped coming",
    tab: "retention",
    stub: stubRetention,
    row: "stats-lapsed-guest-2",
    guest: ["guest-2", "Beto"],
  },
] as const;

describe("Stats links to guests", () => {
  LINKS.forEach(({ list, tab, stub, row, guest: [id, name] }) => {
    it(`opens a guest from ${list}, and Back returns to the same tab`, () => {
      stub();
      stubGuestPage(id, name);
      visitStats(`/stats?tab=${tab}&range=12m`);
      cy.getBySel(row).within(() => {
        cy.getByRole("link", { name }).click();
      });
      cy.location("pathname").should("eq", `/guests/${id}`);
      cy.wait("@getGuest");
      cy.getByRole("heading", { name }).should("be.visible");
      cy.go("back");
      cy.location("pathname").should("eq", "/stats");
      cy.location("search").should("eq", `?tab=${tab}&range=12m`);
      cy.getBySel(`stats-tab-${tab}`).should(
        "have.attr",
        "aria-selected",
        "true",
      );
      cy.getBySel(row).should("be.visible");
    });
  });
});
