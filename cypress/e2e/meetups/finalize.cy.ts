import {
  makeMeetup,
  makeMeetupGuest,
  makeMeetupStats,
  type Role,
} from "../../../src/tests/factories";
import { formatDateTime } from "../../../src/lib/format";
import {
  checkDialogA11y,
  expectToast,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const OPEN = makeMeetup({
  id: "m-1",
  name: "Alter Night",
  requires_payment: true,
});
const FINALIZED_AT = "2026-10-02T05:00:00Z";
const CLOSED = { ...OPEN, is_finalized: true, finalized_at: FINALIZED_AT };
const STATS = makeMeetupStats({
  attendance: {
    total_rsvps: 10,
    arrived_count: 7,
    not_arrived_count: 3,
    walkin_count: 0,
  },
});
const IN_PAID = makeMeetupGuest({
  guest: { id: "g-in", displayname: "Inside" },
  rsvp: {
    has_arrived: true,
    arrival_order: 1,
    has_paid: true,
    paid_at: "2026-10-01T22:30:00Z",
  },
});
const NEVER_PAID = makeMeetupGuest({
  guest: { id: "g-out", displayname: "Never Paid" },
});
const FREE_OUT = makeMeetupGuest({
  guest: { id: "g-free", displayname: "Late" },
  rsvp: { guest_type: "INVITED" },
});

const row = (id: string) => cy.getBySel(`guest-row-${id}`);

describe("Finalize a meetup", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("finalizes after showing the attendance, and locks the door at once", () => {
    stubMeetupPage({
      meetup: OPEN,
      guests: [IN_PAID, NEVER_PAID],
      stats: STATS,
    });
    visitMeetup("m-1");
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/finalize",
      { body: CLOSED, params: { meetup_id: "m-1" }, delay: 300 },
    ).as("finalize");

    cy.getBySel("meetup-finalize")
      .should("have.text", "Finalize meetup")
      .click();
    cy.getByRole("dialog", {
      name: "Finalize Alter Night?",
      native: false,
    }).should("be.visible");
    cy.getBySel("finalize-dialog").within(() => {
      cy.getBySel("finalize-summary").should(
        "have.text",
        "7 of 10 checked in. 3 never arrived.",
      );
      cy.contains(
        "Undoing a check-in or a payment stays available for corrections",
      ).should("be.visible");
    });
    checkDialogA11y("finalize-dialog");
    stubMeetupPage({
      meetup: CLOSED,
      guests: [IN_PAID, NEVER_PAID],
      stats: STATS,
    });
    cy.getBySel("finalize-dialog").findBySel("dialog-confirm").click();
    cy.getBySel("finalize-dialog")
      .findBySel("dialog-confirm")
      .should("have.text", "Finalizing…")
      .and("be.disabled");

    cy.wait("@finalize");
    expectToast("Alter Night finalized");
    cy.getBySel("finalize-dialog").should("not.exist");
    cy.getBySel("meetup-badge-finalized").should("have.text", "Finalized");
    cy.getBySel("meetup-finalized-on").should(
      "have.text",
      `Finalized on ${formatDateTime(FINALIZED_AT)}`,
    );
    cy.getBySel("meetup-finalized-note").should(
      "contain.text",
      "Check-ins, walk-ins, sync, and payments are closed.",
    );
    cy.getBySel("meetup-finalize").should("have.text", "Reopen meetup");
    // Pending RSVPs became no-shows, so the list and the stats refetch.
    cy.wait(["@guests", "@stats"]);
  });

  it("keeps the dialog open when the backend refuses", () => {
    stubMeetupPage({ meetup: OPEN, guests: [IN_PAID], stats: STATS });
    visitMeetup("m-1");
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/finalize",
      { statusCode: 409, detail: "Meetup is already finalized" },
    ).as("finalize");

    cy.getBySel("meetup-finalize").click();
    cy.getBySel("finalize-dialog").findBySel("dialog-confirm").click();
    cy.wait("@finalize");
    expectToast("Meetup is already finalized", "error");
    cy.getBySel("finalize-dialog").should("be.visible");
    cy.getBySel("meetup-sync").should("be.visible");
  });

  it("reopens a finalized meetup", () => {
    stubMeetupPage({ meetup: CLOSED, guests: [NEVER_PAID] });
    visitMeetup("m-1");
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/unfinalize",
      { body: OPEN, params: { meetup_id: "m-1" } },
    ).as("reopen");
    stubMeetupPage({ meetup: OPEN, guests: [NEVER_PAID] });

    cy.getBySel("meetup-finalize").should("have.text", "Reopen meetup").click();
    cy.getByRole("dialog", {
      name: "Reopen Alter Night?",
      native: false,
    }).should(
      "contain.text",
      "Use this if the meetup was finalized by mistake.",
    );
    checkDialogA11y("finalize-dialog");
    cy.getBySel("finalize-dialog")
      .findBySel("dialog-confirm")
      .should("have.text", "Reopen meetup")
      .click();

    cy.wait("@reopen");
    expectToast("Alter Night reopened");
    cy.getBySel("meetup-finalized-note").should("not.exist");
    cy.getBySel("meetup-sync").should("be.enabled");
    cy.getBySel("meetup-add-walkin").should("be.visible");
    row("g-out").findBySel("guest-mark-paid").should("be.visible");
  });
});

describe("A finalized meetup", () => {
  it("hides the door tools and refuses new check-ins and payments", () => {
    cy.loginAs("orgAdmin");
    stubMeetupPage({ meetup: CLOSED, guests: [IN_PAID, NEVER_PAID, FREE_OUT] });
    visitMeetup("m-1");

    cy.getBySel("meetup-toolbar").within(() => {
      cy.getBySel("meetup-sync").should("not.exist");
      cy.getBySel("meetup-add-walkin").should("not.exist");
      cy.getBySel("meetup-payment-toggle").should("not.exist");
    });
    row("g-free")
      .findBySel("guest-check-in")
      .should("be.disabled")
      .should(($button) => {
        const id = $button.attr("aria-describedby") ?? "";
        expect(
          $button[0].ownerDocument.getElementById(id)?.textContent,
        ).to.equal("This meetup is finalized");
      });
    row("g-out").findBySel("guest-mark-paid").should("not.exist");
    // Corrections stay open.
    row("g-in").findBySel("guest-undo-check-in").should("be.enabled");
    row("g-in").findBySel("guest-undo-payment").should("be.visible");
  });

  (["staff", "orgAdmin", "siteAdmin"] as Role[]).forEach((role) => {
    it(`${role === "staff" ? "does not let" : "lets"} ${role} reopen it`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: CLOSED, guests: [NEVER_PAID] });
      visitMeetup("m-1");
      cy.getBySel("meetup-finalized-note").should("be.visible");
      cy.getBySel("meetup-finalize").should(
        role === "staff" ? "not.exist" : "be.visible",
      );
    });
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("drops the steps band but keeps the unpaid line and the undos", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: CLOSED, guests: [IN_PAID, NEVER_PAID] });
      visitMeetup("m-1");

      row("g-out").within(() => {
        cy.getBySel("guest-line-payment").should(
          "have.text",
          "Entrance fee not paid",
        );
        cy.getBySel("guest-check-in").should("not.exist");
        cy.getBySel("guest-mark-paid").should("not.exist");
      });
      row("g-in").within(() => {
        cy.getBySel("guest-undo-check-in").should("be.visible");
        cy.getBySel("guest-undo-payment").should("be.visible");
      });
      cy.checkA11yAA('[data-cy="meetup-page"]');
    });
  });
});
