import { makeBannedGuest, type Schema } from "@/tests/factories";
import { BanReason } from "./BanReason";

const PATH = "/organizations/{org_id}/guests/banned" as const;
const BAN = makeBannedGuest({
  id: "g-yen",
  banned_reason: "Fight at Alter #40",
  banned_by: { id: 2, username: "krapp" },
});

function respond(guests: Schema<"BannedGuestPublic">[], delay?: number) {
  cy.stubApi("GET", PATH, {
    body: { total: guests.length, guests },
    params: { org_id: "org-1" },
    delay,
  }).as("banned");
}

function mount() {
  cy.mount(
    <div data-cy="wrap">
      <BanReason orgId="org-1" guestId="g-yen" />
    </div>,
  );
}

describe("<BanReason />", () => {
  it("quotes the reason and who vanted the guest", () => {
    respond([BAN]);
    mount();
    cy.getBySel("ban-reason-text").should("have.text", "Fight at Alter #40");
    cy.getBySel("ban-reason-author").should("have.text", "– Vanted by krapp");
    cy.checkA11yAA('[data-cy="wrap"]');
  });

  it("leaves the author out when the ban has none", () => {
    respond([{ ...BAN, banned_by_id: null, banned_by: null }]);
    mount();
    cy.getBySel("ban-reason-text").should("be.visible");
    cy.getBySel("ban-reason-author").should("not.exist");
  });

  it("says no reason is recorded when the guest is not on the list", () => {
    respond([]);
    mount();
    cy.getBySel("ban-reason-message").should(
      "have.text",
      "No reason recorded.",
    );
  });

  it("shows a labelled placeholder while the list loads", () => {
    respond([BAN], 800);
    mount();
    cy.getByRole("status", {
      name: "Loading the vant reason",
      native: false,
    }).should("be.visible");
    cy.wait("@banned");
    cy.getBySel("ban-reason-text").should("be.visible");
  });

  it("says so when the list cannot be loaded", () => {
    cy.stubApiError("GET", PATH, { statusCode: 500 }).as("banned");
    mount();
    cy.getBySel("ban-reason-message").should(
      "have.text",
      "Couldn't load the vant reason.",
    );
  });
});
