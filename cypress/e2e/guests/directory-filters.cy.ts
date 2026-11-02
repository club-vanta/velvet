import { makeGuest, makeMazmoProfile } from "../../../src/tests/factories";
import {
  shouldListNames,
  stubGuestsPage,
  vanted,
  shouldBeSettled,
} from "../../support/routes/guests";

const ANA = makeGuest({
  id: "g-ana",
  displayname: "Ana",
  mazmo_handle: null,
  mazmo_user_id: null,
  mazmo_profile: null,
});
const BEA = makeGuest({
  id: "g-bea",
  displayname: "Bea",
  mazmo_handle: "zbea",
  mazmo_user_id: 20,
  instagram_username: "bea",
  mazmo_profile: makeMazmoProfile({ pronoun: "FEMALE" }),
});
const CAMI = makeGuest({
  id: "g-cami",
  displayname: "Cami",
  mazmo_handle: "acami",
  mazmo_user_id: 10,
  mazmo_profile: makeMazmoProfile({ pronoun: "MALE", mazmo_suspended: true }),
});
const DANI = makeGuest({
  id: "g-dani",
  displayname: "Dani",
  mazmo_handle: "dani",
  mazmo_user_id: 30,
  instagram_username: "ani",
  mazmo_profile: makeMazmoProfile({ pronoun: "NEUTRAL" }),
});
const ALL = ["Ana", "Bea", "Cami", "Dani"];

function pick(group: string, option: string) {
  cy.getBySel("list-filter").click();
  cy.getByRole("group", { name: group, native: false })
    .getByRole("menuitemradio", { name: option })
    .click();
  cy.press(Cypress.Keyboard.Keys.ESC);
}

function toggle(option: string) {
  cy.getBySel("list-filter").click();
  cy.getByRole("menuitemcheckbox", { name: option }).click();
  cy.press(Cypress.Keyboard.Keys.ESC);
}

describe("Guest directory filters", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
    stubGuestsPage({ guests: [DANI, CAMI, BEA, ANA], banned: [vanted(DANI)] });
    cy.visit("/guests");
    cy.wait(["@getGuests", "@getBanned"]);
    shouldListNames("guests-directory", ALL);
  });

  const radios: [string, string, string, string[]][] = [
    ["Mazmo account", "Without Mazmo", "Without Mazmo", ["Ana"]],
    ["Mazmo account", "With Mazmo", "With Mazmo", ["Bea", "Cami", "Dani"]],
    ["Instagram", "With Instagram", "With Instagram", ["Bea", "Dani"]],
    ["Instagram", "Without Instagram", "Without Instagram", ["Ana", "Cami"]],
    ["Pronouns", "she/her", "Pronouns: she/her", ["Bea"]],
    ["Pronouns", "they/them", "Pronouns: they/them", ["Dani"]],
  ];
  radios.forEach(([group, option, chip, names]) => {
    it(`filters by ${group}: ${option}, with a removable chip`, () => {
      pick(group, option);

      shouldListNames("guests-directory", names);
      cy.getBySel("list-filter-count").should("have.text", "1");
      cy.getBySel("list-count").should(
        "have.text",
        `Showing ${names.length} of 4`,
      );
      cy.getByRole("button", { name: `Remove filter: ${chip}` }).click();
      shouldListNames("guests-directory", ALL);
      cy.getBySel("list-filter-count").should("not.exist");
    });
  });

  it("shows only the guests vanted in this org", () => {
    toggle("Vanted");

    shouldListNames("guests-directory", ["Dani"]);
    cy.getByRole("button", { name: "Remove filter: Vanted" }).should("exist");
  });

  it("shows only the guests Mazmo banned or suspended", () => {
    toggle("Flagged by Mazmo");

    shouldListNames("guests-directory", ["Cami"]);
    cy.getBySel("guest-row-g-cami")
      .findBySel("guest-badge-mazmo-suspended")
      .should("have.text", "Suspended on Mazmo");
  });

  it("combines filters, says when none match, and clears them all at once", () => {
    pick("Mazmo account", "Without Mazmo");
    toggle("Vanted");

    cy.getBySel("guests-empty").should(
      "have.text",
      "No guests match these filters.",
    );
    cy.getBySel("list-filter-count").should("have.text", "2");
    cy.getBySel("list-clear-filters").click();
    shouldListNames("guests-directory", ALL);
    cy.getBySel("list-count").should("not.exist");
  });

  it("searches within the filtered guests", () => {
    pick("Mazmo account", "With Mazmo");
    cy.getBySel("list-search").type("ana");

    cy.getBySel("guests-empty").should(
      "have.text",
      "No guests match that search.",
    );
    cy.getBySel("list-search").clear();
    cy.getBySel("list-search").type("dani");
    shouldListNames("guests-directory", ["Dani"]);
    cy.getBySel("list-count").should("have.text", "Showing 1 of 4");
  });

  it("has no accessibility violations with the filter menu open", () => {
    cy.getBySel("list-filter").click();
    shouldBeSettled("menu");
    cy.checkA11yAA();
  });
});
