import { makeGuest, makeMazmoProfile } from "@/tests/factories";
import type { Schema } from "@/tests/factories";
import { formatFullDateTime } from "@/lib/format";
import { IdentityCard } from "./IdentityCard";

const LUNA = makeGuest({
  displayname: "Luna",
  mazmo_handle: "luna",
  mazmo_user_id: 1001,
  instagram_username: "luna.ig",
  mazmo_profile: makeMazmoProfile({ pronoun: "FEMALE" }),
});

function mount(guest: Schema<"GuestPublic"> = LUNA, showBanned = false) {
  cy.mount(
    <div className="@container">
      <IdentityCard
        guest={guest}
        Title="h1"
        detailsAs="h2"
        showBanned={showBanned}
      />
    </div>,
  );
}

describe("<IdentityCard />", () => {
  it("titles the card with the name and labels the avatar", () => {
    mount();
    cy.getByRole("heading", { name: "Luna" }).should("match", "h1");
    cy.getByRole("heading", { name: "Details" }).should("match", "h2");
    cy.getByRole("img", { name: "Profile picture of Luna", native: false });
    cy.getBySel("guest-profile-pronoun").should("have.text", "she/her");
  });

  it("shows the Mazmo ID, Instagram link and sync date", () => {
    mount();
    cy.getBySel("guest-profile-mazmo-id").should("have.text", "1001");
    cy.getByRole("link", { name: "@luna.ig on Instagram" }).should(
      "have.attr",
      "href",
      "https://instagram.com/luna.ig",
    );
    cy.getBySel("guest-profile-synced-at").should(
      "have.text",
      `Mazmo data from ${formatFullDateTime("2026-09-01T00:00:00Z")}`,
    );
  });

  it("shows Not set for missing IDs and no sync date without a profile", () => {
    mount(
      makeGuest({
        mazmo_user_id: null,
        instagram_username: null,
        mazmo_profile: null,
      }),
    );
    cy.getBySel("guest-profile-mazmo-id").should("have.text", "Not set");
    cy.getBySel("guest-profile-instagram").should("have.text", "Not set");
    cy.getBySel("guest-profile-synced-at").should("not.exist");
  });

  it("shows the org vant and Mazmo's flags as badges", () => {
    mount(
      { ...LUNA, mazmo_profile: makeMazmoProfile({ mazmo_suspended: true }) },
      true,
    );
    cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
    cy.getBySel("guest-badge-mazmo-suspended").should(
      "have.text",
      "Suspended on Mazmo",
    );
  });

  it("has no accessibility violations", () => {
    mount(LUNA, true);
    cy.checkA11yAA();
  });
});
