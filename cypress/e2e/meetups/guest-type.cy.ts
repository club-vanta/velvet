import {
  makeMeetup,
  makeMeetupGuest,
  type Role,
} from "../../../src/tests/factories";
import {
  expectToast,
  stubMeetupGuests,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({ id: "m-1", requires_payment: true });
const LUNA = makeMeetupGuest({
  guest: { id: "g-luna", displayname: "Luna" },
});
const LUNA_VENDOR = makeMeetupGuest({
  guest: LUNA.guest,
  rsvp: { guest_type: "VENDOR" },
});

const option = (name: RegExp) =>
  cy.getByRole("menuitemradio", { name, native: false });

function openMenu() {
  cy.getBySel("guest-row-g-luna").findBySel("guest-actions").click();
  cy.getByRole("menu", { native: false }).should("be.visible");
}

function stubSetType() {
  cy.stubApi(
    "PATCH",
    "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
    { body: LUNA_VENDOR, params: { guest_id: "g-luna" } },
  ).as("setType");
}

describe("Change a guest's type", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("sets the picked type and shows it on the row", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");
    stubSetType();
    stubMeetupGuests("m-1", [LUNA_VENDOR]);

    openMenu();
    cy.getByRole("group", { name: "Guest type", native: false }).should(
      "be.visible",
    );
    option(/^Regular/).should("have.attr", "aria-checked", "true");
    cy.checkA11yAA('[data-cy="guest-actions-menu"]');
    option(/^Vendor/).click();

    cy.wait("@setType")
      .its("request.body")
      .should("deep.equal", { guest_type: "VENDOR" });
    expectToast("Luna: guest type set to Vendor");
    cy.wait(["@guests", "@stats"]);
    cy.getBySel("guest-row-g-luna").within(() => {
      cy.getBySel("guest-badges").contains("Vendor").should("be.visible");
      // A vendor pays no fee, so the door can let them in.
      cy.getBySel("guest-check-in").should("be.enabled");
    });
  });

  it("sends nothing when the current type is picked again", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");
    stubSetType();

    openMenu();
    option(/^Regular/).click();
    cy.getByRole("menu", { native: false }).should("not.exist");
    cy.get("@setType.all").should("have.length", 0);
  });

  it("shows the backend's reason when the change is refused", () => {
    stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
    visitMeetup("m-1");
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
      { statusCode: 409, detail: "Meetup is finalized" },
    ).as("setType");

    openMenu();
    option(/^Staff/).click();
    cy.wait("@setType");
    expectToast("Meetup is finalized", "error");
  });

  it("locks the types of a finalized meetup and says why", () => {
    stubMeetupPage({
      meetup: { ...MEETUP, is_finalized: true },
      guests: [LUNA],
    });
    visitMeetup("m-1");

    openMenu();
    cy.getByRole("menuitemradio", { native: false })
      .should("have.length", 4)
      .each(($item) => expect($item).to.have.attr("aria-disabled", "true"));
    // Two groups carry the name (the labelled section and its radio group);
    // the radio group points at the reason.
    cy.getByRole("group", { name: "Guest type", native: false }).should(
      ($groups) => {
        const hintId = $groups
          .filter("[aria-describedby]")
          .attr("aria-describedby");
        expect(
          $groups[0].ownerDocument.getElementById(hintId ?? "")?.textContent,
        ).to.equal("This meetup is finalized, so guest types can't change.");
      },
    );
  });
});

describe("Guest types by role", () => {
  const cases: { role: Role; admin: boolean }[] = [
    { role: "staff", admin: false },
    { role: "orgAdmin", admin: true },
    { role: "siteAdmin", admin: true },
  ];
  cases.forEach(({ role, admin }) => {
    it(`${admin ? "offers" : "hides"} guest types for ${role}`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
      visitMeetup("m-1");

      openMenu();
      cy.getByRole("menuitem", { name: "View profile", native: false }).should(
        "be.visible",
      );
      if (admin)
        cy.getByRole("menuitemradio", { native: false }).should(
          "have.length",
          4,
        );
      else cy.getByRole("menuitemradio", { native: false }).should("not.exist");
    });
  });
});

describe(
  "Guest types on a phone",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    it("changes the type from the card's menu", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: MEETUP, guests: [LUNA] });
      visitMeetup("m-1");
      stubSetType();
      stubMeetupGuests("m-1", [LUNA_VENDOR]);

      openMenu();
      option(/^Vendor/).click();
      cy.wait(["@setType", "@guests"]);
      cy.getBySel("guest-row-g-luna")
        .findBySel("guest-line-payment")
        .should("have.text", "Exempt from payment: runs a stand");
    });
  },
);
