import { makeMazmoProfile } from "@/tests/factories";
import { GuestTypeBadge, MazmoFlagBadges, PronounPill } from "./GuestBadges";

describe("<GuestTypeBadge />", () => {
  it("renders nothing for a regular guest", () => {
    cy.mount(
      <div data-cy="host">
        <GuestTypeBadge guestType="NORMAL" />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("names the exceptions, in the UI language", () => {
    cy.mount(<GuestTypeBadge guestType="VENDOR" />);
    cy.getBySel("guest-type-badge").should("have.text", "Vendor");
  });

  it("names them in Spanish too", () => {
    cy.mount(<GuestTypeBadge guestType="INVITED" />, { lang: "es" });
    cy.getBySel("guest-type-badge").should("have.text", "Cortesía");
  });

  it("shows a type it does not know as is", () => {
    cy.mount(<GuestTypeBadge guestType="VIP" />);
    cy.getBySel("guest-type-badge").should("have.text", "VIP");
  });
});

describe("<MazmoFlagBadges />", () => {
  it("renders nothing without a profile or without flags", () => {
    cy.mount(
      <div data-cy="host">
        <MazmoFlagBadges profile={null} />
        <MazmoFlagBadges profile={makeMazmoProfile()} />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("shows every flag Mazmo set, each with its explanation", () => {
    cy.mount(
      <MazmoFlagBadges
        profile={makeMazmoProfile({
          mazmo_banned: true,
          mazmo_suspended: true,
          mazmo_deleted: true,
        })}
      />,
    );
    cy.getBySel("guest-badge-mazmo-deleted")
      .should("have.text", "Mazmo account deleted")
      .and("have.attr", "title", "This account no longer exists on Mazmo");
    cy.getBySel("guest-badge-mazmo-banned")
      .should("have.text", "Banned on Mazmo")
      .and(
        "have.attr",
        "title",
        "Flag set by Mazmo itself, not a vant in this organization",
      );
    cy.getBySel("guest-badge-mazmo-suspended").should(
      "have.text",
      "Suspended on Mazmo",
    );
    cy.checkA11yAA();
  });
});

describe("<PronounPill />", () => {
  it("renders nothing without a pronoun", () => {
    cy.mount(
      <div data-cy="host">
        <PronounPill pronoun={null} />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("shows the short form and tells screen readers what it is", () => {
    cy.mount(<PronounPill pronoun="FEMALE" />);
    cy.getBySel("guest-pronoun")
      .should("have.text", "Pronouns: she/her")
      .and("have.attr", "title", "Pronouns: Feminine");
  });

  it("uses the Spanish short form", () => {
    cy.mount(<PronounPill pronoun="NEUTRAL" />, { lang: "es" });
    cy.getBySel("guest-pronoun").should("have.text", "Pronombres: elle");
  });

  it("shows a code Mazmo added later as is", () => {
    cy.mount(<PronounPill pronoun="OTHER" />);
    cy.getBySel("guest-pronoun").should("have.text", "Pronouns: OTHER");
  });
});
