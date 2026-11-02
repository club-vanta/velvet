import {
  makeBannedGuest,
  makeGuest,
  makeGuestMeetups,
  makeMazmoProfile,
  makeNameHistory,
} from "@/tests/factories";
import type { Schema } from "@/tests/factories";
import { GuestProfile } from "./GuestProfile";

const JUAN = makeGuest({
  id: "g-1",
  mazmo_user_id: 200003,
  mazmo_handle: "juanp",
  displayname: "Juan P.",
  instagram_username: "juan.ig",
  mazmo_profile: makeMazmoProfile({
    age: 31,
    gender: "MALE_CIS",
    pronoun: "MALE",
  }),
});

function stubProfile(
  guest: Schema<"GuestPublic"> = JUAN,
  banned: Schema<"BannedGuestPublic">[] = [],
) {
  cy.stubApi("GET", "/guests/{guest_id}", { body: guest }).as("getGuest");
  cy.stubApi("GET", "/guests/{guest_id}/displayname-history", {
    body: makeNameHistory(),
  });
  cy.stubApi("GET", "/organizations/{org_id}/guests/{guest_id}/meetups", {
    body: makeGuestMeetups(),
    params: { org_id: "org-1", guest_id: "g-1" },
  }).as("getMeetups");
  cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
    body: { total: banned.length, guests: banned },
  }).as("getBanned");
}

function mount(props: Partial<Parameters<typeof GuestProfile>[0]> = {}) {
  cy.mount(
    <GuestProfile
      guestId="g-1"
      orgId="org-1"
      orgName="Club Vanta"
      {...props}
    />,
    { as: "staff" },
  );
}

describe("<GuestProfile />", () => {
  it("shows identity and Mazmo profile details", () => {
    stubProfile();
    mount();
    cy.getByRole("heading", { name: "Juan P." }).should("match", "h1");
    cy.getBySel("guest-fact-age-value").should("have.text", "31 years");
    cy.getBySel("guest-fact-gender-value").should("have.text", "Cis man");
    cy.getBySel("guest-fact-pronouns-value").should("have.text", "Masculine");
    cy.getByRole("link", { name: "@juanp on Mazmo" }).should(
      "have.attr",
      "href",
      "https://mazmo.net/@juanp",
    );
    cy.getBySel("guest-profile-pronoun").should("have.text", "he/him");
    cy.getBySel("guest-profile-mazmo-id").should("have.text", "200003");
    cy.getByRole("link", { name: "@juan.ig on Instagram" }).should(
      "have.attr",
      "href",
      "https://instagram.com/juan.ig",
    );
  });

  it("shows the name history and the meetups for the active org", () => {
    stubProfile();
    mount();
    cy.wait("@getMeetups");
    cy.getByRole("heading", { name: "Meetups" }).should("match", "h2");
    cy.getByRole("heading", { name: "Name history" }).should("match", "h2");
  });

  it("drops a heading level inside the meetup page's side sheet", () => {
    stubProfile();
    mount({ titleAs: "h2" });
    cy.getByRole("heading", { name: "Juan P." }).should("match", "h2");
    cy.getByRole("heading", { name: "Meetups" }).should("match", "h3");
  });

  it("shows the org vant with its reason", () => {
    stubProfile(JUAN, [
      makeBannedGuest({ id: "g-1", banned_reason: "Aggressive at Alter #40" }),
    ]);
    mount();
    cy.getBySel("guest-vant-title").should("have.text", "Vanted in Club Vanta");
    cy.getBySel("guest-vant-reason").should(
      "have.text",
      "Aggressive at Alter #40",
    );
    cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
  });

  it("names this organization when no org name is given", () => {
    stubProfile(JUAN, [makeBannedGuest({ id: "g-1" })]);
    mount({ orgName: undefined });
    cy.getBySel("guest-vant-title").should(
      "have.text",
      "Vanted in this organization",
    );
  });

  it("shows the vant the caller knows of while the vanted list loads", () => {
    stubProfile();
    cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
      body: { total: 0, guests: [] },
      delay: 800,
    }).as("getBanned");
    mount({ knownBanned: true });
    cy.getBySel("guest-badge-vanted").should("be.visible");
    cy.wait("@getBanned");
    cy.getBySel("guest-badge-vanted").should("not.exist");
  });

  it("passes the vant state to the actions, unknown until loaded", () => {
    stubProfile(JUAN, [makeBannedGuest({ id: "g-1" })]);
    mount({
      actions: (guest, ban, banKnown) => (
        <span data-cy="actions">
          {`${guest.displayname}|${ban ? "vanted" : "none"}|${banKnown}`}
        </span>
      ),
    });
    cy.getBySel("actions").should("have.text", "Juan P.|vanted|true");
  });

  it("calls out Mazmo's own ban as separate from org vants", () => {
    stubProfile({
      ...JUAN,
      mazmo_profile: makeMazmoProfile({ mazmo_banned: true }),
    });
    mount();
    cy.getBySel("guest-mazmo-flag-title").should(
      "have.text",
      "Mazmo banned this account",
    );
    cy.getBySel("guest-badge-mazmo-banned").should(
      "have.text",
      "Banned on Mazmo",
    );
    cy.getBySel("guest-profile-handle").should("have.text", "@juanp");
    cy.getByRole("link", { name: /juanp/ }).should("not.exist");
    cy.getBySel("guest-badge-vanted").should("not.exist");
  });

  it("explains a guest with no Mazmo account", () => {
    stubProfile({
      ...JUAN,
      mazmo_user_id: null,
      mazmo_handle: null,
      mazmo_profile: null,
    });
    mount();
    cy.getBySel("guest-profile-no-facts").should(
      "have.text",
      "No Mazmo account linked, so there is no Mazmo profile data.",
    );
  });

  it("shows a placeholder while the guest loads", () => {
    stubProfile();
    cy.stubApi("GET", "/guests/{guest_id}", { body: JUAN, delay: 800 });
    mount();
    cy.getBySel("guest-profile-loading").should(
      "have.attr",
      "aria-busy",
      "true",
    );
    cy.getBySel("guest-profile-name").should("have.text", "Juan P.");
  });

  it("shows a not-found state for an unknown guest, without retry", () => {
    stubProfile();
    cy.stubApiError("GET", "/guests/{guest_id}", { statusCode: 404 }).as(
      "getGuest",
    );
    mount();
    cy.getByRole("heading", { name: "Guest not found" }).should("match", "h1");
    cy.getByRole("button", { name: "Retry" }).should("not.exist");
    cy.get("@getGuest.all").should("have.length", 1);
  });

  it("shows the vant status error with a retry", () => {
    stubProfile();
    cy.stubApiError("GET", "/organizations/{org_id}/guests/banned", {
      statusCode: 500,
    });
    mount();
    cy.getBySel("guest-vant-status-message").should(
      "have.text",
      "Couldn't check whether this guest is vanted.",
    );
  });

  it("has no accessibility violations", () => {
    stubProfile(JUAN, [makeBannedGuest({ id: "g-1" })]);
    mount();
    cy.getBySel("guest-vant-alert").should("be.visible");
    cy.checkA11yAA();
  });
});
