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

  it("sends the picked guest type for this RSVP", () => {
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
      {
        body: makeMeetupGuest({
          guest: LUNA.guest,
          rsvp: { guest_type: "VENDOR" },
        }),
        params: { org_id: "org-1", meetup_id: "meetup-1", guest_id: "g-luna" },
      },
    ).as("setType");
    open();
    option(/^Regular/).should("have.attr", "aria-checked", "true");
    option(/^Vendor/)
      .should("contain.text", "Runs a stand at the event, no entry fee")
      .click();
    cy.wait("@setType")
      .its("request.body")
      .should("deep.equal", { guest_type: "VENDOR" });
  });

  it("sends nothing when the current type is picked again", () => {
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
      { body: LUNA },
    ).as("setType");
    open();
    option(/^Regular/).click();
    cy.getBySel("guest-actions-menu").should("not.exist");
    cy.get("@setType.all").should("have.length", 0);
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
