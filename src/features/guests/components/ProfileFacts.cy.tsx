import { makeGuest, makeMazmoProfile } from "@/tests/factories";
import type { Schema } from "@/tests/factories";
import { ProfileFacts } from "./ProfileFacts";

function mount(guest: Schema<"GuestPublic">, lang: "en" | "es" = "en") {
  cy.mount(
    <div className="@container">
      <ProfileFacts guest={guest} />
    </div>,
    { lang },
  );
}

describe("<ProfileFacts />", () => {
  it("translates Mazmo's gender and pronoun codes", () => {
    mount(
      makeGuest({
        mazmo_profile: makeMazmoProfile({
          age: 31,
          gender: "NOT_BINARY",
          pronoun: "NEUTRAL",
        }),
      }),
      "es",
    );
    cy.getBySel("guest-fact-gender-value").should("have.text", "No binarie");
    cy.getBySel("guest-fact-age-value").should("have.text", "31 años");
    cy.getBySel("guest-fact-pronouns-value").should("have.text", "Neutral");
  });

  it("shows a code Mazmo added later as is, and Not set for blanks", () => {
    mount(
      makeGuest({
        mazmo_profile: makeMazmoProfile({
          age: null,
          gender: "SOMETHING_NEW",
          pronoun: null,
        }),
      }),
    );
    cy.getBySel("guest-fact-gender-value").should("have.text", "SOMETHING_NEW");
    cy.getBySel("guest-fact-age-value").should("have.text", "Not set");
    cy.getBySel("guest-fact-pronouns-value").should("have.text", "Not set");
  });

  it("explains a linked guest not synced yet", () => {
    mount(makeGuest({ mazmo_user_id: 1001, mazmo_profile: null }));
    cy.getBySel("guest-profile-no-facts").should(
      "have.text",
      "Mazmo profile data isn't synced yet. It shows up after the next sync of a meetup this guest RSVPed to.",
    );
    cy.getBySel("guest-fact-age").should("not.exist");
  });

  it("explains a guest with no Mazmo account", () => {
    mount(makeGuest({ mazmo_user_id: null, mazmo_profile: null }));
    cy.getBySel("guest-profile-no-facts").should(
      "have.text",
      "No Mazmo account linked, so there is no Mazmo profile data.",
    );
  });

  it("has no accessibility violations", () => {
    mount(makeGuest());
    cy.checkA11yAA();
  });
});
