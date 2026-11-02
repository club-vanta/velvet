import { makeMeetupGuest } from "@/tests/factories";
import { formatDateTime } from "@/lib/format";
import { PaymentStatus } from "./PaymentStatus";

const PAID_AT = "2026-10-01T22:40:00Z";

function mount(guest = makeMeetupGuest(), isOrgAdmin = true) {
  cy.mount(
    <div data-cy="status">
      <PaymentStatus
        guest={guest}
        isOrgAdmin={isOrgAdmin}
        onUndoPayment={cy.spy().as("onUndo")}
      />
    </div>,
  );
}

describe("<PaymentStatus />", () => {
  it("says the fee is pending", () => {
    mount();
    cy.getBySel("status").should("have.text", "Payment pending");
    cy.getBySel("guest-undo-payment").should("not.exist");
  });

  it("shows when the fee was paid, with an undo for admins", () => {
    mount(makeMeetupGuest({ rsvp: { has_paid: true, paid_at: PAID_AT } }));
    cy.getBySel("status").should(
      "have.text",
      `Paid${formatDateTime(PAID_AT)}Undo payment`,
    );
    cy.getBySel("guest-undo-payment").click();
    cy.get("@onUndo").should("have.been.calledOnce");
  });

  it("hides the undo from staff", () => {
    mount(
      makeMeetupGuest({ rsvp: { has_paid: true, paid_at: PAID_AT } }),
      false,
    );
    cy.getBySel("guest-undo-payment").should("not.exist");
  });

  it("marks exempt guests, keeping the undo of a fee paid before", () => {
    mount(makeMeetupGuest({ rsvp: { guest_type: "VENDOR" } }));
    cy.getBySel("status").should("have.text", "Exempt");

    mount(
      makeMeetupGuest({
        rsvp: { guest_type: "STAFF", has_paid: true, paid_at: PAID_AT },
      }),
    );
    cy.getBySel("status").should(
      "have.text",
      `ExemptPaid · ${formatDateTime(PAID_AT)}Undo payment`,
    );
  });

  it("has no accessibility violations", () => {
    mount(makeMeetupGuest({ rsvp: { has_paid: true, paid_at: PAID_AT } }));
    cy.checkA11yAA('[data-cy="status"]');
  });
});
