import { makeGuest } from "../../../src/tests/factories";
import {
  shouldBeSettled,
  shouldListNames,
  stubGuestsPage,
} from "../../support/routes/guests";

const GUESTS = [
  makeGuest({
    id: "g-ana",
    displayname: "Ana",
    mazmo_handle: null,
    mazmo_user_id: null,
    instagram_username: null,
  }),
  makeGuest({
    id: "g-bea",
    displayname: "Bea",
    mazmo_handle: "zbea",
    mazmo_user_id: 20,
    instagram_username: "bea",
  }),
  makeGuest({
    id: "g-cami",
    displayname: "Cami",
    mazmo_handle: "acami",
    mazmo_user_id: 10,
    instagram_username: null,
  }),
  makeGuest({
    id: "g-dani",
    displayname: "Dani",
    mazmo_handle: "dani",
    mazmo_user_id: 30,
    instagram_username: "ani",
  }),
  makeGuest({
    id: "g-nico",
    displayname: "Nicolás",
    mazmo_handle: "nico",
    mazmo_user_id: 40,
  }),
  makeGuest({
    id: "g-nandu",
    displayname: "Ñandú",
    mazmo_handle: "nandu",
    mazmo_user_id: 50,
  }),
];

function sortBy(field: string, direction?: string) {
  cy.getBySel("list-sort").click();
  cy.getByRole("group", { name: "Sort by", native: false })
    .getByRole("menuitemradio", { name: field })
    .click();
  if (direction) {
    cy.getByRole("group", { name: "Direction", native: false })
      .getByRole("menuitemradio", { name: direction })
      .click();
  }
  cy.press(Cypress.Keyboard.Keys.ESC);
}

describe("Guest directory sorting", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubGuestsPage({ guests: GUESTS });
    cy.visit("/guests");
    cy.wait("@getGuests");
  });

  it("sorts by name A to Z by default, with Ñ after N", () => {
    cy.getBySel("list-sort").should("have.text", "Sort by:Name");
    shouldListNames("guests-directory", [
      "Ana",
      "Bea",
      "Cami",
      "Dani",
      "Nicolás",
      "Ñandú",
    ]);
  });

  it("sorts by name Z to A", () => {
    sortBy("Name", "Z to A");
    shouldListNames("guests-directory", [
      "Ñandú",
      "Nicolás",
      "Dani",
      "Cami",
      "Bea",
      "Ana",
    ]);
  });

  it("sorts by Mazmo ID with unlinked guests last in both directions", () => {
    sortBy("Mazmo ID");
    cy.getBySel("list-sort").should("have.text", "Sort by:Mazmo ID");
    shouldListNames("guests-directory", [
      "Cami",
      "Bea",
      "Dani",
      "Nicolás",
      "Ñandú",
      "Ana",
    ]);

    sortBy("Mazmo ID", "Highest first");
    shouldListNames("guests-directory", [
      "Ñandú",
      "Nicolás",
      "Dani",
      "Bea",
      "Cami",
      "Ana",
    ]);
  });

  it("labels the direction for the field it sorts", () => {
    sortBy("Mazmo ID");
    cy.getBySel("list-sort").click();
    cy.getByRole("group", { name: "Direction", native: false })
      .getByRole("menuitemradio")
      .should(($items) => {
        expect($items.toArray().map((el) => el.textContent)).to.deep.equal([
          "Lowest first",
          "Highest first",
        ]);
      });
  });

  it("sorts by Mazmo user, guests without one last", () => {
    sortBy("Mazmo user");
    shouldListNames("guests-directory", [
      "Cami",
      "Dani",
      "Ñandú",
      "Nicolás",
      "Bea",
      "Ana",
    ]);
  });

  it("sorts by Instagram, guests without one last by name", () => {
    sortBy("Instagram");
    shouldListNames("guests-directory", [
      "Dani",
      "Bea",
      "Ana",
      "Cami",
      "Nicolás",
      "Ñandú",
    ]);
  });

  it("has no accessibility violations with the sort menu open", () => {
    cy.getBySel("list-sort").click();
    shouldBeSettled("menu");
    cy.checkA11yAA();
  });
});
