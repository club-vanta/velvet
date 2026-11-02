import {
  makeDirectoryGuests,
  makeGuest,
  makeMeetup,
  makeMeetupGuest,
  type Role,
} from "../../../src/tests/factories";
import {
  checkDialogA11y,
  expectToast,
  stubGuestDirectory,
  stubMeetupGuests,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({ id: "m-1", name: "Alter Night" });
const ON_LIST = makeMeetupGuest({
  guest: { id: "g-ya", displayname: "Juan Perez Ya", mazmo_handle: "juanya" },
});
const PEREZ = makeGuest({
  id: "g-perez",
  displayname: "Juan Pérez",
  mazmo_handle: "jperez",
});
const NANDU = makeGuest({
  id: "g-nandu",
  displayname: "Ñandú",
  mazmo_handle: null,
  mazmo_user_id: null,
});
const BARMAN = makeGuest({
  id: "g-barman",
  displayname: "ʙᴀʀᴍᴀɴ",
  mazmo_handle: "barman",
});
const DIRECTORY = [ON_LIST.guest, PEREZ, NANDU, BARMAN];

const candidate = (id: string) => cy.getBySel(`walkin-candidate-${id}`);

function openPicker() {
  cy.getBySel("meetup-add-walkin").click();
  cy.getByRole("dialog", { name: "Add walk-in guest", native: false }).should(
    "be.visible",
  );
}

describe("Add a walk-in", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubMeetupPage({ meetup: MEETUP, guests: [ON_LIST] });
    visitMeetup("m-1");
  });

  it("lists the known guests who are not on the list yet", () => {
    stubGuestDirectory(DIRECTORY);
    openPicker();
    cy.wait("@directory");

    cy.getBySel("walkin-list").within(() => {
      cy.getBySelLike("walkin-candidate-").should("have.length", 3);
      candidate("g-ya").should("not.exist");
      candidate("g-nandu")
        .should("contain.text", "No Mazmo account")
        .findBySel("walkin-name")
        .should("have.text", "Ñandú");
    });
    cy.focused().should("have.attr", "data-cy", "walkin-search");
    checkDialogA11y("walkin-dialog");
  });

  it("searches by name without accents or styled letters", () => {
    stubGuestDirectory(DIRECTORY);
    openPicker();
    cy.wait("@directory");

    cy.getBySel("walkin-search").type("perez");
    cy.getBySelLike("walkin-candidate-").should("have.length", 1);
    candidate("g-perez").should("be.visible");

    cy.getBySel("walkin-search").clear();
    cy.getBySel("walkin-search").type("nandu");
    cy.getBySelLike("walkin-candidate-").should("have.length", 1);
    candidate("g-nandu").should("be.visible");

    cy.getBySel("walkin-search").clear();
    cy.getBySel("walkin-search").type("barman");
    candidate("g-barman").should("be.visible");

    cy.getBySel("walkin-search").clear();
    cy.getBySel("walkin-search").type("@jperez");
    candidate("g-perez").should("be.visible");
  });

  it("adds the guest, closes the picker and refreshes the list", () => {
    stubGuestDirectory(DIRECTORY);
    cy.stubApi(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/add-walkin",
      {
        body: makeMeetupGuest({ guest: PEREZ, rsvp: { is_walkin: true } }),
        statusCode: 201,
        params: { guest_id: "g-perez" },
      },
    ).as("addWalkin");
    stubMeetupGuests("m-1", [
      ON_LIST,
      makeMeetupGuest({ guest: PEREZ, rsvp: { is_walkin: true } }),
    ]);
    openPicker();
    cy.wait("@directory");

    candidate("g-perez").findBySel("walkin-add").click();

    cy.wait("@addWalkin")
      .its("request.url")
      .should("match", /\/meetups\/m-1\/guests\/g-perez\/add-walkin$/);
    expectToast("Juan Pérez added as walk-in");
    cy.getBySel("walkin-dialog").should("not.exist");
    cy.wait(["@guests", "@stats"]);
    cy.getBySel("guest-row-g-perez")
      .findBySel("guest-badges")
      .contains("Walk-in")
      .should("be.visible");
  });

  it("keeps the picker open when the backend refuses the walk-in", () => {
    stubGuestDirectory(DIRECTORY);
    cy.stubApiError(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/add-walkin",
      { statusCode: 409, detail: "Guest is already on this meetup" },
    ).as("addWalkin");
    openPicker();
    cy.wait("@directory");

    candidate("g-perez").findBySel("walkin-add").click();
    cy.wait("@addWalkin");
    expectToast("Guest is already on this meetup", "error");
    cy.getBySel("walkin-dialog").should("be.visible");
    candidate("g-perez").findBySel("walkin-add").should("be.enabled");
  });

  it("says when nobody is left to add, and when a search matches nobody", () => {
    stubGuestDirectory([ON_LIST.guest]);
    openPicker();
    cy.wait("@directory");
    cy.getBySel("walkin-empty").should(
      "have.text",
      "All known guests are already on the RSVP list.",
    );

    cy.getBySel("walkin-search").type("zzz");
    cy.getBySel("walkin-empty").should(
      "have.text",
      "No eligible guests match that search.\nThey may already be on the RSVP list.",
    );
  });

  it("shows placeholders while the directory loads", () => {
    cy.stubApi("GET", "/guests/", {
      body: { total: DIRECTORY.length, guests: DIRECTORY },
      delay: 800,
    }).as("directory");
    openPicker();
    cy.getBySel("walkin-loading").should("be.visible");
    cy.getBySel("walkin-empty").should("not.exist");
    cy.wait("@directory");
    cy.getBySel("walkin-loading").should("not.exist");
    candidate("g-perez").should("be.visible");
  });

  it("mounts a long directory a page at a time as the list scrolls", () => {
    stubGuestDirectory(makeDirectoryGuests(250));
    openPicker();
    cy.wait("@directory");

    cy.getBySelLike("walkin-candidate-").should("have.length", 100);
    cy.getByRole("button", { name: "Show 100 more" }).should("exist");
    cy.getBySel("walkin-list").scrollTo("bottom");
    cy.getBySelLike("walkin-candidate-").should("have.length", 200);
    cy.getByRole("button", { name: "Show 50 more" }).should("exist");

    // A new search starts again from the first page.
    cy.getBySel("walkin-search").type("directory 01");
    cy.getBySelLike("walkin-candidate-").should("have.length", 100);
  });

  it("closes on Cancel without adding anyone", () => {
    stubGuestDirectory(DIRECTORY);
    openPicker();
    cy.getBySel("walkin-dialog").findBySel("dialog-cancel").click();
    cy.getBySel("walkin-dialog").should("not.exist");
  });
});

describe("Walk-ins by role", () => {
  (["staff", "orgAdmin", "siteAdmin"] as Role[]).forEach((role) => {
    it(`lets ${role} add walk-ins`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: MEETUP, guests: [ON_LIST] });
      stubGuestDirectory(DIRECTORY);
      visitMeetup("m-1");
      openPicker();
      candidate("g-perez").findBySel("walkin-add").should("be.enabled");
    });
  });
});

describe(
  "Walk-ins on a phone",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    it("adds a walk-in from the phone", () => {
      cy.loginAs("staff");
      stubMeetupPage({ meetup: MEETUP, guests: [ON_LIST] });
      stubGuestDirectory(DIRECTORY);
      cy.stubApi(
        "POST",
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/add-walkin",
        {
          body: makeMeetupGuest({ guest: NANDU, rsvp: { is_walkin: true } }),
          statusCode: 201,
        },
      ).as("addWalkin");
      visitMeetup("m-1");

      openPicker();
      checkDialogA11y("walkin-dialog");
      cy.getBySel("walkin-search").type("ñan");
      candidate("g-nandu").findBySel("walkin-add").click();
      cy.wait("@addWalkin");
      expectToast("Ñandú added as walk-in");
    });
  },
);
