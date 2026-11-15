import { makeGuest } from "../../../src/tests/factories";
import { shouldListNames, stubGuestsPage } from "../../support/routes/guests";

const GUESTS = [
  makeGuest({ id: "g-perez", displayname: "Juan Pérez", mazmo_handle: null }),
  makeGuest({ id: "g-nandu", displayname: "Ñandú", mazmo_handle: "nandu_x" }),
  makeGuest({ id: "g-barman", displayname: "𝑩𝑨𝑹𝑴𝑨𝑵", mazmo_handle: "bm" }),
  makeGuest({ id: "g-caps", displayname: "ꜱᴇʟᴇɴᴇ", mazmo_handle: "sel" }),
  makeGuest({ id: "g-fire", displayname: "🔥Luna Roja", mazmo_handle: "lr" }),
  makeGuest({ id: "g-cindy", displayname: "Cindy", mazmo_handle: "cindydark" }),
];

describe("Guest directory search", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubGuestsPage({ guests: GUESTS });
    cy.visit("/guests");
    cy.wait("@getGuests");
  });

  it("filters the loaded list in the browser, without a request per keystroke", () => {
    cy.getByRole("searchbox", { name: "Search guest list…" }).type("cin");

    shouldListNames("guests-directory", ["Cindy"]);
    cy.getBySel("list-count").should("have.text", "Showing 1 of 6");
    cy.get("@getGuests.all").should("have.length", 1);
  });

  const matches: [string, string, string][] = [
    ["accents", "perez", "Juan Pérez"],
    ["ñ typed as n", "nandu", "Ñandú"],
    ["styled Mazmo letters", "barman", "𝑩𝑨𝑹𝑴𝑨𝑵"],
    ["small caps", "selene", "ꜱᴇʟᴇɴᴇ"],
    ["an emoji name", "luna roja", "🔥Luna Roja"],
    ["words in any order", "perez juan", "Juan Pérez"],
    ["a handle typed with @", "@cindyd", "Cindy"],
  ];
  matches.forEach(([what, query, expected]) => {
    it(`matches ${what}`, () => {
      cy.getBySel("list-search").type(query);
      shouldListNames("guests-directory", [expected]);
    });
  });

  it("keeps the search field when nothing matches, so it can be cleared", () => {
    cy.getBySel("list-search").type("zzz");

    cy.getBySel("guests-empty").should(
      "have.text",
      "No guests match that search.",
    );
    cy.getBySel("list-count").should("have.text", "Showing 0 of 6");
    cy.getBySel("list-search").clear();
    cy.getBySel("guest-name").should("have.length", 6);
    cy.getBySel("list-count").should("not.exist");
  });
});
