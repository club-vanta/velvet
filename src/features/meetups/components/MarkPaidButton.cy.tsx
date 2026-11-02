import { makeGuestRowContext, makeMeetupGuest } from "@/tests/factories";
import type { GuestRowContext } from "../lib/guestRow";
import { MarkPaidButton } from "./MarkPaidButton";

const OWES = makeMeetupGuest();
const ADMIN_PAID: Partial<GuestRowContext> = {
  requiresPayment: true,
  isOrgAdmin: true,
};

function mount(ctx: Partial<GuestRowContext>, guest = OWES) {
  cy.mount(
    <MarkPaidButton
      guest={guest}
      ctx={makeGuestRowContext({
        onMarkPaid: cy.spy().as("onMarkPaid"),
        ...ctx,
      })}
    />,
  );
}

describe("<MarkPaidButton />", () => {
  it("lets an admin record the fee", () => {
    mount(ADMIN_PAID);
    cy.getBySel("guest-mark-paid").should("have.text", "Mark paid").click();
    cy.get("@onMarkPaid").should("have.been.calledOnceWith", OWES);
  });

  it("is not offered to staff", () => {
    mount({ ...ADMIN_PAID, isOrgAdmin: false });
    cy.getBySel("guest-mark-paid").should("not.exist");
  });

  it("is not offered on a free or finalized meetup", () => {
    mount({ ...ADMIN_PAID, requiresPayment: false });
    cy.getBySel("guest-mark-paid").should("not.exist");
    mount({ ...ADMIN_PAID, isFinalized: true });
    cy.getBySel("guest-mark-paid").should("not.exist");
  });

  it("is not offered when there is nothing to collect", () => {
    mount(ADMIN_PAID, makeMeetupGuest({ rsvp: { has_paid: true } }));
    cy.getBySel("guest-mark-paid").should("not.exist");
    mount(ADMIN_PAID, makeMeetupGuest({ rsvp: { guest_type: "INVITED" } }));
    cy.getBySel("guest-mark-paid").should("not.exist");
  });
});
