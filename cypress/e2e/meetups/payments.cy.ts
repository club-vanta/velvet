import {
  makeGuest,
  makeMeetup,
  makeMeetupGuest,
  makePaymentResponse,
  type Role,
} from "../../../src/tests/factories";
import {
  checkDialogA11y,
  expectToast,
  stubMeetupGuests,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const PAID_MEETUP = makeMeetup({
  id: "m-1",
  name: "Alter Night",
  requires_payment: true,
});
const OWES = makeMeetupGuest({
  guest: { id: "g-owes", displayname: "Owes", mazmo_handle: "owes" },
});
const OWES_PAID = makeMeetupGuest({
  guest: OWES.guest,
  rsvp: { has_paid: true, paid_at: "2026-10-01T23:10:00Z" },
});
const PAID = makeMeetupGuest({
  guest: { id: "g-paid", displayname: "Paid", mazmo_handle: "paid" },
  rsvp: { has_paid: true, paid_at: "2026-10-01T22:40:00Z" },
});
const PAID_UNDONE = makeMeetupGuest({ guest: PAID.guest });

const row = (id: string) => cy.getBySel(`guest-row-${id}`);

/** The text of the element an `aria-describedby` points at. */
function describedBy(subject: JQuery<HTMLElement>) {
  const id = subject.attr("aria-describedby");
  expect(id, "aria-describedby").to.be.a("string");
  return subject[0].ownerDocument.getElementById(id!)?.textContent;
}

describe("Payments at a paid meetup", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("keeps an unpaid guest out until the fee is recorded, and says why", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
    visitMeetup("m-1");

    row("g-owes").within(() => {
      cy.getBySel("guest-payment-status").should(
        "contain.text",
        "Payment pending",
      );
      cy.getBySel("guest-mark-paid").should("have.text", "Mark paid");
      cy.getBySel("guest-check-in")
        .should("be.disabled")
        .should(($button) =>
          expect(describedBy($button)).to.equal(
            "This guest has to pay the entrance fee first",
          ),
        );
    });
  });

  it("marks a guest paid, which lets them check in", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
    visitMeetup("m-1");
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment",
      {
        body: makePaymentResponse({ guest: makeGuest(OWES.guest) }),
        params: { guest_id: "g-owes" },
      },
    ).as("markPaid");
    stubMeetupGuests("m-1", [OWES_PAID]);

    row("g-owes").findBySel("guest-mark-paid").click();
    cy.getByRole("dialog", {
      name: "Confirm payment for Owes?",
      native: false,
    }).should("be.visible");
    checkDialogA11y("mark-paid-dialog");
    cy.getBySel("mark-paid-dialog").findBySel("dialog-confirm").click();

    cy.wait("@markPaid")
      .its("request.url")
      .should("match", /\/meetups\/m-1\/guests\/g-owes\/payment$/);
    expectToast("Owes — Payment recorded");
    cy.getBySel("mark-paid-dialog").should("not.exist");
    cy.wait(["@guests", "@stats"]);
    row("g-owes").within(() => {
      cy.getBySel("guest-payment-status").should("contain.text", "Paid");
      cy.getBySel("guest-mark-paid").should("not.exist");
      cy.getBySel("guest-check-in").should("be.enabled");
    });
  });

  it("shows the backend's reason when a payment is refused", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
    visitMeetup("m-1");
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment",
      { statusCode: 409, detail: "Guest already paid" },
    ).as("markPaid");

    row("g-owes").findBySel("guest-mark-paid").click();
    cy.getBySel("mark-paid-dialog").findBySel("dialog-confirm").click();
    cy.wait("@markPaid");
    expectToast("Guest already paid", "error");
    cy.getBySel("mark-paid-dialog").should("be.visible");
  });

  it("undoes a payment with a reason", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [PAID] });
    visitMeetup("m-1");
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment/undo",
      { body: makeGuest(PAID.guest), params: { guest_id: "g-paid" } },
    ).as("undoPayment");
    stubMeetupGuests("m-1", [PAID_UNDONE]);

    row("g-paid").findBySel("guest-undo-payment").click();
    cy.getByRole("dialog", {
      name: "Undo payment for Paid?",
      native: false,
    }).should("be.visible");
    checkDialogA11y("undo-payment-dialog");
    cy.getBySel("reason-input").type("Marked the wrong guest");
    cy.getBySel("undo-payment-dialog").findBySel("dialog-confirm").click();

    cy.wait("@undoPayment")
      .its("request.body")
      .should("deep.equal", { reason: "Marked the wrong guest" });
    expectToast("Payment undone");
    cy.wait("@guests");
    row("g-paid").within(() => {
      cy.getBySel("guest-payment-status").should(
        "contain.text",
        "Payment pending",
      );
      cy.getBySel("guest-check-in").should("be.disabled");
    });
  });

  (
    [
      ["INVITED", "Invited"],
      ["VENDOR", "Vendor"],
      ["STAFF", "Staff"],
    ] as const
  ).forEach(([type, label]) => {
    it(`lets an unpaid ${label.toLowerCase()} guest in without a fee`, () => {
      stubMeetupPage({
        meetup: PAID_MEETUP,
        guests: [
          makeMeetupGuest({
            guest: { id: "g-x", displayname: "Guest Of Honor" },
            rsvp: { guest_type: type },
          }),
        ],
      });
      visitMeetup("m-1");

      row("g-x").within(() => {
        cy.getBySel("guest-badges").contains(label).should("be.visible");
        cy.getBySel("guest-payment-status").should("contain.text", "Exempt");
        cy.getBySel("guest-mark-paid").should("not.exist");
        cy.getBySel("guest-check-in").should("be.enabled");
      });
    });
  });

  it("keeps Undo payment for someone who paid before becoming exempt", () => {
    stubMeetupPage({
      meetup: PAID_MEETUP,
      guests: [
        makeMeetupGuest({
          guest: { id: "g-rec", displayname: "Reclassified" },
          rsvp: {
            guest_type: "STAFF",
            has_paid: true,
            paid_at: "2026-10-01T22:00:00Z",
          },
        }),
      ],
    });
    visitMeetup("m-1");

    row("g-rec").within(() => {
      cy.getBySel("guest-payment-status")
        .should("contain.text", "Exempt")
        .and("contain.text", "Paid ·");
      cy.getBySel("guest-undo-payment").should("have.text", "Undo payment");
    });
  });

  it("drops the payment column on a free meetup", () => {
    stubMeetupPage({
      meetup: { ...PAID_MEETUP, requires_payment: false },
      guests: [OWES],
    });
    visitMeetup("m-1");

    cy.getBySel("guest-table")
      .getByRole("columnheader", { name: "Payment" })
      .should("not.exist");
    row("g-owes").within(() => {
      cy.getBySel("guest-payment-status").should("not.exist");
      cy.getBySel("guest-mark-paid").should("not.exist");
      cy.getBySel("guest-check-in").should("be.enabled");
    });
  });

  it("holds check-ins while the meetup's payment rule is unknown", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}", {
      body: PAID_MEETUP,
      delay: 1500,
    }).as("meetup");
    cy.visit("/meetups/m-1");
    cy.wait("@guests");

    row("g-owes").findBySel("guest-check-in").should("be.disabled");
    cy.wait("@meetup");
    row("g-owes").findBySel("guest-mark-paid").should("be.visible");
  });
});

describe("The payment requirement", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("turns a paid meetup into a free one", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
    visitMeetup("m-1");
    const free = { ...PAID_MEETUP, requires_payment: false };
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/disable-payment",
      { body: free, params: { meetup_id: "m-1" } },
    ).as("disable");
    stubMeetupPage({ meetup: free, guests: [OWES] });

    cy.getBySel("meetup-payment-toggle")
      .should("have.text", "Disable payment")
      .click();
    cy.getByRole("dialog", {
      name: "Make this a free event?",
      native: false,
    }).should("be.visible");
    checkDialogA11y("payment-requirement-dialog");
    cy.getBySel("payment-requirement-dialog")
      .findBySel("dialog-confirm")
      .should("have.text", "Disable payment")
      .click();

    cy.wait("@disable");
    expectToast("Event updated");
    cy.wait("@meetup");
    cy.getBySel("meetup-payment-toggle").should("have.text", "Enable payment");
    cy.getBySel("meetup-badge-paid").should("not.exist");
    row("g-owes").within(() => {
      cy.getBySel("guest-payment-status").should("not.exist");
      cy.getBySel("guest-check-in").should("be.enabled");
    });
  });

  it("turns a free meetup into a paid one", () => {
    const free = { ...PAID_MEETUP, requires_payment: false };
    stubMeetupPage({ meetup: free, guests: [OWES] });
    visitMeetup("m-1");
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/enable-payment",
      { body: PAID_MEETUP, params: { meetup_id: "m-1" } },
    ).as("enable");
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });

    cy.getBySel("meetup-payment-toggle").click();
    cy.getByRole("dialog", {
      name: "Make this a paid event?",
      native: false,
    }).should(
      "contain.text",
      "Guests who have not paid will not be able to check in.",
    );
    cy.getBySel("payment-requirement-dialog")
      .findBySel("dialog-confirm")
      .click();

    cy.wait("@enable");
    cy.wait("@meetup");
    cy.getBySel("meetup-payment-toggle").should("have.text", "Disable payment");
    cy.getBySel("meetup-badge-paid").should("have.text", "Paid event");
    row("g-owes").findBySel("guest-check-in").should("be.disabled");
  });

  it("keeps the dialog open when the change is refused", () => {
    stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
    visitMeetup("m-1");
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/disable-payment",
      { statusCode: 409, detail: "Meetup is finalized" },
    ).as("disable");

    cy.getBySel("meetup-payment-toggle").click();
    cy.getBySel("payment-requirement-dialog")
      .findBySel("dialog-confirm")
      .click();
    cy.wait("@disable");
    expectToast("Meetup is finalized", "error");
    cy.getBySel("payment-requirement-dialog").should("be.visible");
  });
});

describe("Payments by role", () => {
  const cases: { role: Role; admin: boolean }[] = [
    { role: "staff", admin: false },
    { role: "orgAdmin", admin: true },
    { role: "siteAdmin", admin: true },
  ];
  cases.forEach(({ role, admin }) => {
    it(`${admin ? "lets" : "does not let"} ${role} record or undo payments`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES, PAID] });
      visitMeetup("m-1");

      row("g-owes")
        .findBySel("guest-mark-paid")
        .should(admin ? "be.visible" : "not.exist");
      row("g-paid")
        .findBySel("guest-undo-payment")
        .should(admin ? "be.visible" : "not.exist");
      cy.getBySel("meetup-payment-toggle").should(
        admin ? "be.visible" : "not.exist",
      );
      // Nobody gets an unpaid guest in.
      row("g-owes").findBySel("guest-check-in").should("be.disabled");
    });
  });
});

describe(
  "Payments on a phone",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    it("explains a blocked check-in with the card's unpaid line", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
      visitMeetup("m-1");

      row("g-owes").within(() => {
        cy.getBySel("guest-line-payment").should(
          "have.text",
          "Entrance fee not paid",
        );
        cy.getBySel("guest-mark-paid").should("be.visible");
        cy.getBySel("guest-check-in")
          .should("be.disabled")
          .should(($button) =>
            expect(describedBy($button)).to.equal("Entrance fee not paid"),
          );
      });
    });

    it("marks a guest paid from their card", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
      visitMeetup("m-1");
      cy.stubApi(
        "PATCH",
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/payment",
        { body: makePaymentResponse({ guest: makeGuest(OWES.guest) }) },
      ).as("markPaid");
      stubMeetupGuests("m-1", [OWES_PAID]);

      row("g-owes").findBySel("guest-mark-paid").click();
      cy.getBySel("mark-paid-dialog").findBySel("dialog-confirm").click();
      cy.wait(["@markPaid", "@guests"]);
      row("g-owes").within(() => {
        cy.getBySel("guest-line-payment").should("contain.text", "Paid");
        cy.getBySel("guest-mark-paid").should("not.exist");
        cy.getBySel("guest-check-in").should("be.enabled");
      });
    });

    (
      [
        ["INVITED", "Exempt from payment: courtesy guest"],
        ["VENDOR", "Exempt from payment: runs a stand"],
        ["STAFF", "Exempt from payment: event staff"],
      ] as const
    ).forEach(([type, reason]) => {
      it(`says why a ${type} guest pays no fee`, () => {
        cy.loginAs("orgAdmin");
        stubMeetupPage({
          meetup: PAID_MEETUP,
          guests: [
            makeMeetupGuest({
              guest: { id: "g-x" },
              rsvp: { guest_type: type },
            }),
          ],
        });
        visitMeetup("m-1");
        row("g-x").within(() => {
          cy.getBySel("guest-line-payment").should("have.text", reason);
          cy.getBySel("guest-mark-paid").should("not.exist");
          cy.getBySel("guest-check-in").should("be.enabled");
        });
      });
    });

    it("keeps the paid line's undo readable on its tint", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: PAID_MEETUP, guests: [PAID] });
      visitMeetup("m-1");
      row("g-paid")
        .findBySel("guest-line-payment")
        .findBySel("guest-undo-payment")
        .should("be.visible");
      // The undo takes the tint's color, which keeps it at AA contrast.
      cy.checkA11yAA('[data-cy="guest-cards"]');
    });

    it("hides the paid line's undo from staff", () => {
      cy.loginAs("staff");
      stubMeetupPage({ meetup: PAID_MEETUP, guests: [PAID] });
      visitMeetup("m-1");
      row("g-paid").within(() => {
        cy.getBySel("guest-line-payment").should("contain.text", "Paid");
        cy.getBySel("guest-undo-payment").should("not.exist");
      });
    });

    it("shows no unpaid line while the meetup is loading", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: PAID_MEETUP, guests: [OWES] });
      cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}", {
        body: PAID_MEETUP,
        delay: 1500,
      }).as("meetup");
      cy.visit("/meetups/m-1");
      cy.wait("@guests");
      row("g-owes").within(() => {
        cy.getBySel("guest-line-payment").should("not.exist");
        cy.getBySel("guest-check-in").should("be.disabled");
      });
    });
  },
);
