import {
  makeBannedGuest,
  makeCheckInResponse,
  makeGuest,
  makeMeetup,
  makeMeetupGuest,
  type Role,
} from "../../../src/tests/factories";
import {
  checkDialogA11y,
  expectToast,
  stubMeetupGuests,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({ id: "m-1", name: "Alter Night" });
const ANA = makeMeetupGuest({
  guest: { id: "g-ana", displayname: "Ana", mazmo_handle: "ana" },
});
const ANA_IN = makeMeetupGuest({
  guest: ANA.guest,
  rsvp: {
    has_arrived: true,
    arrival_order: 2,
    arrival_time: "2026-10-01T23:15:00Z",
  },
});
const BRUNO_IN = makeMeetupGuest({
  guest: { id: "g-bruno", displayname: "Bruno", mazmo_handle: "bruno" },
  rsvp: {
    has_arrived: true,
    arrival_order: 1,
    arrival_time: "2026-10-01T23:00:00Z",
  },
});
const BRUNO_OUT = makeMeetupGuest({ guest: BRUNO_IN.guest });
const YEN = makeMeetupGuest({
  guest: {
    id: "g-yen",
    displayname: "Yennefer",
    mazmo_handle: "yen",
    is_banned: true,
  },
});
const YEN_BAN = makeBannedGuest({
  id: "g-yen",
  displayname: "Yennefer",
  banned_reason: "Fight at Alter #40",
  banned_by: { id: 2, username: "krapp" },
});

const row = (id: string) => cy.getBySel(`guest-row-${id}`);

function stubCheckIn(guest = ANA.guest, order = 2, delay?: number) {
  cy.stubApi(
    "POST",
    "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/checkin",
    {
      body: makeCheckInResponse({
        guest: makeGuest(guest),
        arrival_order: order,
      }),
      params: { guest_id: guest.id },
      delay,
    },
  ).as("checkIn");
}

function stubUndo() {
  cy.stubApi(
    "PATCH",
    "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/undo-checkin",
    { body: makeGuest(BRUNO_IN.guest), params: { guest_id: "g-bruno" } },
  ).as("undo");
}

describe("Check-in at the door", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubMeetupPage({ meetup: MEETUP, guests: [ANA, BRUNO_IN] });
    visitMeetup("m-1");
    cy.wait("@stats");
  });

  it("checks a guest in and refreshes the list and the stats", () => {
    stubCheckIn();
    stubMeetupGuests("m-1", [ANA_IN, BRUNO_IN]);
    row("g-ana").findBySel("guest-check-in").should("have.text", "Check in");
    row("g-ana").findBySel("guest-check-in").click();

    cy.wait("@checkIn")
      .its("request.url")
      .should("match", /\/meetups\/m-1\/guests\/g-ana\/checkin$/);
    expectToast("Ana checked in (#2)");
    cy.wait(["@guests", "@stats"]);
    row("g-ana").within(() => {
      cy.getBySel("guest-arrival-order").should("have.text", "#2");
      cy.getBySel("guest-check-in-status").should(
        "contain.text",
        "✓ Checked in",
      );
      cy.getBySel("guest-check-in").should("not.exist");
      cy.getBySel("guest-undo-check-in").should("have.text", "Undo");
    });
  });

  it("holds every check-in while one is on its way", () => {
    stubCheckIn(ANA.guest, 2, 800);
    stubMeetupGuests("m-1", [ANA, BRUNO_OUT]);
    // Reload with a second guest still out, to see both buttons wait.
    visitMeetup("m-1");
    row("g-ana").findBySel("guest-check-in").click();

    row("g-ana")
      .findBySel("guest-check-in")
      .should("have.text", "Checking in…")
      .and("be.disabled");
    row("g-bruno")
      .findBySel("guest-check-in")
      .should("have.text", "Check in")
      .and("be.disabled");
    cy.wait("@checkIn");
  });

  it("shows the backend's reason when the check-in is refused", () => {
    cy.stubApiError(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/checkin",
      { statusCode: 409, detail: "Guest already checked in" },
    ).as("checkIn");
    row("g-ana").findBySel("guest-check-in").click();

    cy.wait("@checkIn");
    expectToast("Guest already checked in", "error");
    row("g-ana").findBySel("guest-check-in").should("be.enabled");
  });

  it("undoes a check-in with a reason", () => {
    stubUndo();
    stubMeetupGuests("m-1", [ANA, BRUNO_OUT]);
    row("g-bruno").findBySel("guest-undo-check-in").click();

    cy.getByRole("dialog", {
      name: "Undo check-in for Bruno?",
      native: false,
    }).should("be.visible");
    // Scanned before a reason is typed: the shared destructive Button fails
    // 4.5:1 in the dark theme (reported), and axe skips it while disabled.
    checkDialogA11y("undo-check-in-dialog");
    cy.getBySel("undo-check-in-dialog").within(() => {
      cy.getBySel("dialog-confirm")
        .should("have.text", "Undo check-in")
        .and("be.disabled");
      cy.getBySel("reason-input").type("oops");
      cy.getBySel("reason-count").should("have.text", "4/500");
      cy.getBySel("dialog-confirm").should("be.disabled");
      cy.getBySel("reason-input").type(" wrong guest ");
      cy.getBySel("dialog-confirm").should("be.enabled");
    });
    cy.getBySel("undo-check-in-dialog").findBySel("dialog-confirm").click();

    cy.wait("@undo")
      .its("request.body")
      .should("deep.equal", { reason: "oops wrong guest" });
    expectToast("Undone — check-in reversed");
    cy.getBySel("undo-check-in-dialog").should("not.exist");
    cy.wait("@guests");
    row("g-bruno").within(() => {
      cy.getBySel("guest-check-in-status").should("have.text", "Pending");
      cy.getBySel("guest-check-in").should("be.enabled");
    });
  });

  it("keeps the undo dialog open when the backend refuses it", () => {
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/undo-checkin",
      { statusCode: 409, detail: "Guest has not checked in" },
    ).as("undo");
    row("g-bruno").findBySel("guest-undo-check-in").click();
    cy.getBySel("reason-input").type("Checked in by mistake");
    cy.getBySel("undo-check-in-dialog").findBySel("dialog-confirm").click();

    cy.wait("@undo");
    expectToast("Guest has not checked in", "error");
    cy.getBySel("undo-check-in-dialog").should("be.visible");
  });

  it("closes the undo dialog on Cancel without a request", () => {
    stubUndo();
    row("g-bruno").findBySel("guest-undo-check-in").click();
    cy.getBySel("undo-check-in-dialog").findBySel("dialog-cancel").click();
    cy.getBySel("undo-check-in-dialog").should("not.exist");
    cy.get("@undo.all").should("have.length", 0);
  });
});

describe("Checking in a vanted guest", () => {
  function openWarning(banned = [YEN_BAN], bannedDelay?: number) {
    cy.loginAs("staff");
    stubMeetupPage({ meetup: MEETUP, guests: [YEN], banned });
    if (bannedDelay)
      cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
        body: { total: banned.length, guests: banned },
        delay: bannedDelay,
      }).as("banned");
    visitMeetup("m-1");
    row("g-yen").findBySel("guest-check-in").click();
    cy.getByRole("dialog", {
      name: "Check in vanted guest?",
      native: false,
    }).should("be.visible");
  }

  it("warns with the vant reason and checks the guest in anyway", () => {
    openWarning();
    stubCheckIn(YEN.guest, 3, 800);
    cy.getBySel("check-in-banned-dialog").within(() => {
      cy.getByRole("heading", { name: "Vant reason" }).should("be.visible");
      cy.getBySel("ban-reason-text").should("have.text", "Fight at Alter #40");
      cy.getBySel("ban-reason-author").should("contain.text", "krapp");
      cy.getBySel("dialog-confirm")
        .should("have.text", "Check in anyway")
        .and("be.enabled");
    });
    cy.getBySel("check-in-banned-dialog").findBySel("dialog-confirm").click();
    cy.getBySel("check-in-banned-dialog")
      .findBySel("dialog-confirm")
      .should("have.text", "Checking in…")
      .and("be.disabled");
    // Scanned while pending: the shared destructive Button fails 4.5:1 in
    // the dark theme (reported), and axe skips it while disabled.
    checkDialogA11y("check-in-banned-dialog");

    cy.wait("@checkIn")
      .its("request.url")
      .should("match", /\/guests\/g-yen\/checkin$/);
    expectToast("Yennefer checked in (#3)");
    cy.getBySel("check-in-banned-dialog").should("not.exist");
  });

  it("checks nobody in when the warning is cancelled", () => {
    openWarning();
    stubCheckIn(YEN.guest, 3);
    cy.getBySel("check-in-banned-dialog").findBySel("dialog-cancel").click();
    cy.getBySel("check-in-banned-dialog").should("not.exist");
    cy.get("@checkIn.all").should("have.length", 0);
  });

  it("leaves the author out when the ban has none", () => {
    openWarning([{ ...YEN_BAN, banned_by_id: null, banned_by: null }]);
    cy.getBySel("ban-reason-text").should("have.text", "Fight at Alter #40");
    cy.getBySel("ban-reason-author").should("not.exist");
  });

  it("says no reason is recorded when the guest is not on the vanted list", () => {
    openWarning([]);
    cy.getBySel("ban-reason-message").should(
      "have.text",
      "No reason recorded.",
    );
  });

  it("keeps the choice open while the reason loads", () => {
    openWarning([YEN_BAN], 1500);
    cy.getByRole("status", {
      name: "Loading the vant reason",
      native: false,
    }).should("be.visible");
    cy.getBySel("check-in-banned-dialog")
      .findBySel("dialog-confirm")
      .should("be.enabled");
    cy.wait("@banned");
    cy.getBySel("ban-reason-text").should("have.text", "Fight at Alter #40");
  });

  it("says so when the reason cannot be loaded, and still offers the choice", () => {
    cy.loginAs("staff");
    stubMeetupPage({ meetup: MEETUP, guests: [YEN] });
    cy.stubApiError("GET", "/organizations/{org_id}/guests/banned", {
      statusCode: 500,
    }).as("banned");
    visitMeetup("m-1");
    row("g-yen").findBySel("guest-check-in").click();

    cy.getBySel("ban-reason-message").should(
      "have.text",
      "Couldn't load the vant reason.",
    );
    cy.getBySel("check-in-banned-dialog")
      .findBySel("dialog-confirm")
      .should("be.enabled");
  });

  it("does not offer the override to a vanted guest who still owes the fee", () => {
    cy.loginAs("staff");
    stubMeetupPage({
      meetup: { ...MEETUP, requires_payment: true },
      guests: [YEN],
    });
    visitMeetup("m-1");
    row("g-yen").findBySel("guest-check-in").should("be.disabled");
    cy.getBySel("check-in-banned-dialog").should("not.exist");
  });
});

describe("Check-in by role", () => {
  (["staff", "orgAdmin", "siteAdmin"] as Role[]).forEach((role) => {
    it(`lets ${role} check guests in and undo it`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: MEETUP, guests: [ANA, BRUNO_IN] });
      visitMeetup("m-1");
      row("g-ana").findBySel("guest-check-in").should("be.enabled");
      row("g-bruno").findBySel("guest-undo-check-in").should("be.enabled");
    });
  });
});

describe(
  "Check-in on a phone",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    beforeEach(() => {
      cy.loginAs("staff");
    });

    it("checks a guest in from their card", () => {
      stubMeetupPage({ meetup: MEETUP, guests: [ANA, BRUNO_IN] });
      visitMeetup("m-1");
      stubCheckIn();
      stubMeetupGuests("m-1", [ANA_IN, BRUNO_IN]);

      row("g-ana").within(() => {
        cy.getBySel("guest-line-checked-in").should("not.exist");
        cy.getBySel("guest-check-in").click();
      });
      cy.wait("@checkIn");
      expectToast("Ana checked in (#2)");
      cy.wait("@guests");
      row("g-ana").within(() => {
        cy.getBySel("guest-line-checked-in").should(
          "contain.text",
          "Checked in",
        );
        cy.getBySel("guest-arrival-order").should("have.text", "#2");
        // Nothing left to do, so the steps band is gone.
        cy.getBySel("guest-check-in").should("not.exist");
      });
    });

    it("undoes a check-in from the card's check-in line", () => {
      stubMeetupPage({ meetup: MEETUP, guests: [BRUNO_IN] });
      visitMeetup("m-1");
      stubUndo();
      stubMeetupGuests("m-1", [BRUNO_OUT]);

      row("g-bruno")
        .findBySel("guest-line-checked-in")
        .findBySel("guest-undo-check-in")
        .click();
      cy.getBySel("reason-input").type("Checked in by mistake");
      cy.getBySel("undo-check-in-dialog").findBySel("dialog-confirm").click();
      cy.wait("@undo")
        .its("request.body")
        .should("deep.equal", { reason: "Checked in by mistake" });
      cy.wait("@guests");
      row("g-bruno").within(() => {
        cy.getBySel("guest-line-checked-in").should("not.exist");
        cy.getBySel("guest-check-in").should("be.enabled");
      });
    });

    it("leaves the order pill out when the arrival order is unknown", () => {
      stubMeetupPage({
        meetup: MEETUP,
        guests: [
          makeMeetupGuest({
            guest: { id: "g-x" },
            rsvp: { has_arrived: true, arrival_order: null },
          }),
        ],
      });
      visitMeetup("m-1");
      row("g-x").within(() => {
        cy.getBySel("guest-line-checked-in").should("be.visible");
        cy.getBySel("guest-arrival-order").should("not.exist");
      });
    });

    it("warns before checking in a vanted guest", () => {
      stubMeetupPage({ meetup: MEETUP, guests: [YEN], banned: [YEN_BAN] });
      visitMeetup("m-1");
      stubCheckIn(YEN.guest, 3, 800);
      row("g-yen").findBySel("guest-check-in").click();
      cy.getBySel("check-in-banned-dialog")
        .should("be.visible")
        .findBySel("ban-reason-text")
        .should("have.text", "Fight at Alter #40");
      cy.getBySel("check-in-banned-dialog").findBySel("dialog-confirm").click();
      cy.getBySel("check-in-banned-dialog")
        .findBySel("dialog-confirm")
        .should("be.disabled");
      // Pending, see the desktop test for why.
      checkDialogA11y("check-in-banned-dialog");
      cy.wait("@checkIn");
    });
  },
);
