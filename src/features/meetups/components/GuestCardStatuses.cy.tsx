import { makeGuestRowContext, makeMeetupGuest } from "@/tests/factories";
import type { GuestRowContext } from "../lib/guestRow";
import { GuestCardStatuses } from "./GuestCardStatuses";

const IN = { has_arrived: true, arrival_order: 4, arrival_time: null };

function mount(guest = makeMeetupGuest(), ctx: Partial<GuestRowContext> = {}) {
  cy.mount(
    <div data-cy="statuses">
      <GuestCardStatuses
        guest={guest}
        ctx={makeGuestRowContext({
          onUndoCheckIn: cy.spy().as("onUndoCheckIn"),
          onUndoPayment: cy.spy().as("onUndoPayment"),
          ...ctx,
        })}
      />
    </div>,
  );
}

describe("<GuestCardStatuses />", () => {
  it("shows nothing for a guest who is not in at a free meetup", () => {
    mount();
    cy.getBySel("statuses").should("have.text", "");
  });

  it("shows the check-in line with the order and its undo", () => {
    mount(makeMeetupGuest({ rsvp: IN }));
    cy.getBySel("guest-arrival-order").should("have.text", "#4");
    cy.getBySel("guest-line-checked-in").should(
      "have.text",
      "#4Checked inUndo",
    );
    cy.getBySel("guest-undo-check-in").click();
    cy.get("@onUndoCheckIn").should("have.been.calledOnce");
  });

  it("says the fee is owed only once the meetup has loaded", () => {
    mount(makeMeetupGuest(), { requiresPayment: true });
    cy.getBySel("guest-line-payment")
      .should("have.text", "Entrance fee not paid")
      .and("have.attr", "data-cy", "guest-line-payment");
    mount(makeMeetupGuest(), {
      requiresPayment: true,
      paymentStateKnown: false,
    });
    cy.getBySel("guest-line-payment").should("not.exist");
  });

  it("says why an exempt guest pays nothing", () => {
    mount(makeMeetupGuest({ rsvp: { guest_type: "INVITED" } }), {
      requiresPayment: true,
    });
    cy.getBySel("guest-line-payment").should(
      "have.text",
      "Exempt from payment: courtesy guest",
    );
  });

  it("keeps the paid line of an exempt guest, with an undo for admins", () => {
    const paid = makeMeetupGuest({
      rsvp: { has_paid: true, paid_at: null, guest_type: "INVITED" },
    });
    mount(paid, { requiresPayment: true, isOrgAdmin: true });
    cy.getBySel("guest-line-payment").should("have.text", "PaidUndo payment");
    cy.getBySel("guest-undo-payment").click();
    cy.get("@onUndoPayment").should("have.been.calledOnce");
  });

  it("hides the paid line's undo from staff", () => {
    mount(makeMeetupGuest({ rsvp: { has_paid: true, paid_at: null } }), {
      requiresPayment: true,
    });
    cy.getBySel("guest-line-payment").should("have.text", "Paid");
    cy.getBySel("guest-undo-payment").should("not.exist");
  });

  it("keeps the undos readable on their tinted lines", () => {
    mount(makeMeetupGuest({ rsvp: { ...IN, has_paid: true, paid_at: null } }), {
      requiresPayment: true,
      isOrgAdmin: true,
    });
    cy.checkA11yAA('[data-cy="statuses"]');
  });
});
