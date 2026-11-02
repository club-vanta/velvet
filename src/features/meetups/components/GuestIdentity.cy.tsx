import { makeMazmoProfile, makeMeetupGuest } from "@/tests/factories";
import { GuestIdentity } from "./GuestIdentity";

function mount(guest = makeMeetupGuest(), meta?: React.ReactNode) {
  cy.mount(
    <div data-cy="identity">
      <GuestIdentity
        guest={guest}
        onViewProfile={cy.spy().as("onViewProfile")}
        meta={meta}
      />
    </div>,
  );
}

describe("<GuestIdentity />", () => {
  it("opens the profile from the name", () => {
    mount();
    cy.getByRole("button", { name: "Luna" }).click();
    cy.get("@onViewProfile").should("have.been.calledOnce");
  });

  it("shows the Mazmo handle, or says there is no account", () => {
    mount();
    cy.getBySel("guest-handle").should("have.text", "@luna");
    mount(
      makeMeetupGuest({ guest: { mazmo_handle: null, mazmo_user_id: null } }),
    );
    cy.getBySel("guest-handle").should("have.text", "No Mazmo account");
  });

  it("names the pronoun for screen readers", () => {
    mount();
    cy.getBySel("identity")
      .find("[title='Pronouns: Feminine']")
      .should("have.text", "Pronouns: she/her");
  });

  it("badges the type, cancellation, walk-in, vant and Mazmo flags", () => {
    mount(
      makeMeetupGuest({
        guest: {
          is_banned: true,
          mazmo_profile: makeMazmoProfile({ mazmo_suspended: true }),
        },
        rsvp: { guest_type: "VENDOR", cancelled_rsvp: true, is_walkin: true },
      }),
    );
    cy.getBySel("guest-badges").should(
      "have.text",
      "VendorCancelledWalk-inVantedSuspended on Mazmo",
    );
  });

  it("shows no badges for a regular RSVP", () => {
    mount();
    cy.getBySel("guest-badges").should("have.text", "").and("not.be.visible");
  });

  it("puts the meta line under the name", () => {
    mount(makeMeetupGuest(), <p data-cy="meta">RSVP today</p>);
    cy.getBySel("meta").should("have.text", "RSVP today");
  });

  it("has no accessibility violations", () => {
    mount(makeMeetupGuest({ guest: { is_banned: true } }));
    cy.checkA11yAA('[data-cy="identity"]');
  });
});
