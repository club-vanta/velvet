import { makeGuestRowContext, makeMeetupGuest } from "@/tests/factories";
import type { GuestRowContext } from "../lib/guestRow";
import { GuestRowActions } from "./GuestRowActions";

const LUNA = makeMeetupGuest({ guest: { id: "g-luna", displayname: "Luna" } });

function open(ctx: Partial<GuestRowContext> = {}) {
  cy.mount(
    <GuestRowActions
      guest={LUNA}
      ctx={makeGuestRowContext({
        isOrgAdmin: true,
        onViewProfile: cy.spy().as("onViewProfile"),
        ...ctx,
      })}
    />,
  );
  cy.getByRole("button", { name: "Guest actions: Luna" }).click();
}

const option = (name: RegExp) =>
  cy.getByRole("menuitemradio", { name, native: false });

describe("<GuestRowActions />", () => {
  it("opens the profile", () => {
    open();
    cy.getByRole("menuitem", { name: "View profile", native: false }).click();
    cy.get("@onViewProfile").should("have.been.calledOnceWith", LUNA);
  });

  it("asks for the picked guest type for this RSVP", () => {
    open({ onSetGuestType: cy.spy().as("onSetGuestType") });
    option(/^Regular/).should("have.attr", "aria-checked", "true");
    option(/^Vendor/)
      .should("contain.text", "Runs a stand at the event, no entry fee")
      .click();
    cy.get("@onSetGuestType").should(
      "have.been.calledOnceWith",
      LUNA,
      "VENDOR",
    );
  });

  it("asks for nothing when the current type is picked again", () => {
    open({ onSetGuestType: cy.spy().as("onSetGuestType") });
    option(/^Regular/).click();
    cy.getBySel("guest-actions-menu").should("not.exist");
    cy.get("@onSetGuestType").should("not.have.been.called");
  });

  it("locks the types while a type change runs", () => {
    open({ settingType: true });
    cy.getByRole("menuitemradio", { native: false }).each(($item) =>
      expect($item).to.have.attr("aria-disabled", "true"),
    );
  });

  it("offers staff only the profile", () => {
    open({ isOrgAdmin: false });
    cy.getByRole("menuitem", { name: "View profile", native: false }).should(
      "be.visible",
    );
    cy.getByRole("menuitemradio", { native: false }).should("not.exist");
  });

  it("locks the types of a finalized meetup and says why", () => {
    open({ isFinalized: true });
    cy.getByRole("menuitemradio", { native: false })
      .should("have.length", 4)
      .each(($item) => expect($item).to.have.attr("aria-disabled", "true"));
    cy.getBySel("guest-actions-menu").should(
      "contain.text",
      "This meetup is finalized, so guest types can't change.",
    );
  });

  it("moves through the menu with the keyboard and is accessible", () => {
    open();
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.focused()
      .should("have.attr", "role")
      .and("match", /^menuitem/);
    cy.checkA11yAA('[data-cy="guest-actions-menu"]');
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getBySel("guest-actions-menu").should("not.exist");
    cy.getByRole("button", { name: "Guest actions: Luna" }).should(
      "be.focused",
    );
  });
});
