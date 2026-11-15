import { makeMeetup } from "@/tests/factories";
import { MeetupDialogs } from "./MeetupDialogs";

describe("<MeetupDialogs />", () => {
  it("keeps the payment action picked on open when the meetup refetches", () => {
    // The admin opened "Enable payment" on a free meetup; a background
    // refetch then shows the meetup as already paid.
    cy.mount(
      <MeetupDialogs
        dialog={{ kind: "paymentRequirement", enabling: true }}
        orgId="org-1"
        meetupId="meetup-1"
        meetup={makeMeetup({ id: "meetup-1", requires_payment: true })}
        rsvpedIds={new Set()}
        onClose={cy.spy()}
      />,
      { as: "orgAdmin" },
    );
    cy.getBySel("payment-requirement-dialog")
      .findBySel("dialog-confirm")
      .should("have.text", "Enable payment");
  });
});
