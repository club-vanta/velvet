import { makeMazmoProfile } from "@/tests/factories";
import { MazmoFlagAlerts } from "./MazmoFlagAlerts";

describe("<MazmoFlagAlerts />", () => {
  it("renders nothing without a profile or without flags", () => {
    cy.mount(
      <div data-cy="host">
        <MazmoFlagAlerts profile={null} />
        <MazmoFlagAlerts profile={makeMazmoProfile()} />
      </div>,
    );
    cy.getBySel("host").should("be.empty");
  });

  it("explains a Mazmo ban, which takes precedence over a suspension", () => {
    cy.mount(
      <MazmoFlagAlerts
        profile={makeMazmoProfile({
          mazmo_banned: true,
          mazmo_suspended: true,
        })}
      />,
    );
    cy.getBySel("guest-mazmo-flag-alert").should("have.length", 1);
    cy.getBySel("guest-mazmo-flag-title").should(
      "have.text",
      "Mazmo banned this account",
    );
    cy.getByRole("alert").should(
      "contain.text",
      "This comes from Mazmo and is separate from vants in this organization.",
    );
  });

  it("explains a suspension", () => {
    cy.mount(
      <MazmoFlagAlerts profile={makeMazmoProfile({ mazmo_suspended: true })} />,
    );
    cy.getBySel("guest-mazmo-flag-title").should(
      "have.text",
      "Mazmo suspended this account",
    );
  });

  it("explains a deleted account, in Spanish too", () => {
    cy.mount(
      <MazmoFlagAlerts profile={makeMazmoProfile({ mazmo_deleted: true })} />,
      { lang: "es" },
    );
    cy.getBySel("guest-mazmo-deleted-title").should(
      "have.text",
      "Esta cuenta ya no existe en Mazmo",
    );
    cy.getBySel("guest-mazmo-flag-alert").should("not.exist");
  });

  it("has no accessibility violations", () => {
    cy.mount(
      <MazmoFlagAlerts
        profile={makeMazmoProfile({ mazmo_banned: true, mazmo_deleted: true })}
      />,
    );
    cy.checkA11yAA();
  });
});
