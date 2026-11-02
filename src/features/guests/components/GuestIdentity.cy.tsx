import { makeGuest, makeMazmoProfile } from "@/tests/factories";
import { GuestIdentity } from "./GuestIdentity";

describe("<GuestIdentity />", () => {
  it("links the name to the profile, with handle and pronoun", () => {
    cy.mount(
      <GuestIdentity
        guest={makeGuest({
          id: "g-1",
          displayname: "Luna",
          mazmo_handle: "luna",
          mazmo_profile: makeMazmoProfile({ pronoun: "FEMALE" }),
        })}
      />,
    );
    cy.getByRole("link", { name: "Luna" }).should(
      "have.attr",
      "href",
      "/guests/g-1",
    );
    cy.getBySel("guest-handle").should("have.text", "@luna");
    cy.getBySel("guest-pronoun").should("have.text", "Pronouns: she/her");
    cy.getBySel("guest-badge-vanted").should("not.exist");
    cy.getBySel("guest-avatar").should("have.text", "L");
  });

  it("says so when the guest has no Mazmo account", () => {
    cy.mount(
      <GuestIdentity
        guest={makeGuest({ mazmo_handle: null, mazmo_profile: null })}
      />,
    );
    cy.getBySel("guest-handle").should("have.text", "No Mazmo account");
    cy.getBySel("guest-pronoun").should("not.exist");
  });

  it("marks a vanted guest and Mazmo's own flags", () => {
    cy.mount(
      <GuestIdentity
        isBanned
        guest={makeGuest({
          mazmo_profile: makeMazmoProfile({ mazmo_deleted: true }),
        })}
      />,
    );
    cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
    cy.getBySel("guest-badge-mazmo-deleted").should(
      "have.text",
      "Mazmo account deleted",
    );
    cy.checkA11yAA();
  });

  it("uses Spanish copy", () => {
    cy.mount(
      <GuestIdentity isBanned guest={makeGuest({ mazmo_handle: null })} />,
      { lang: "es" },
    );
    cy.getBySel("guest-handle").should("have.text", "Sin cuenta de Mazmo");
    cy.getBySel("guest-badge-vanted").should("have.text", "Vanteado");
  });

  it("reaches the profile link with the keyboard", () => {
    cy.mount(
      <>
        <button type="button">before</button>
        <GuestIdentity guest={makeGuest({ displayname: "Luna" })} />
      </>,
    );
    cy.getByRole("button", { name: "before" }).focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "guest-name");
  });
});
