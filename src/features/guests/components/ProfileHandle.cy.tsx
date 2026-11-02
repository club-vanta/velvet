import { makeGuest, makeMazmoProfile } from "@/tests/factories";
import { ProfileHandle } from "./ProfileHandle";

describe("<ProfileHandle />", () => {
  it("links a live account to mazmo.net, encoded, in a new tab", () => {
    cy.mount(<ProfileHandle guest={makeGuest({ mazmo_handle: "luna_x" })} />);
    cy.getByRole("link", { name: "@luna_x on Mazmo" })
      .should("have.attr", "href", "https://mazmo.net/@luna_x")
      .and("have.attr", "target", "_blank")
      .and("have.attr", "rel", "noreferrer");
    cy.getBySel("guest-profile-handle").should("have.text", "@luna_x");
  });

  const deadFlags = [{ mazmo_deleted: true }, { mazmo_banned: true }];
  deadFlags.forEach((flags) => {
    it(`shows the handle without the 404 link when ${Object.keys(flags)[0]}`, () => {
      cy.mount(
        <ProfileHandle
          guest={makeGuest({
            mazmo_handle: "luna",
            mazmo_profile: makeMazmoProfile(flags),
          })}
        />,
      );
      cy.getBySel("guest-profile-handle")
        .should("have.text", "@luna")
        .and("not.have.attr", "href");
    });
  });

  it("keeps the link for a suspended account", () => {
    cy.mount(
      <ProfileHandle
        guest={makeGuest({
          mazmo_handle: "luna",
          mazmo_profile: makeMazmoProfile({ mazmo_suspended: true }),
        })}
      />,
    );
    cy.getBySel("guest-profile-handle").should("have.attr", "href");
  });

  it("says so when there is no Mazmo account", () => {
    cy.mount(<ProfileHandle guest={makeGuest({ mazmo_handle: null })} />, {
      lang: "es",
    });
    cy.getBySel("guest-profile-handle").should(
      "have.text",
      "Sin cuenta de Mazmo",
    );
  });
});
