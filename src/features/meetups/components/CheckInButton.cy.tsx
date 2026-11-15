import { makeGuestRowContext, makeMeetupGuest } from "@/tests/factories";
import type { GuestRowContext } from "../lib/guestRow";
import { CheckInButton } from "./CheckInButton";

const LUNA = makeMeetupGuest({ guest: { id: "g-luna", displayname: "Luna" } });

function mount(
  ctx: Partial<GuestRowContext> = {},
  guest = LUNA,
  blockedHintId?: string,
) {
  cy.mount(
    <div data-cy="cell">
      <CheckInButton
        guest={guest}
        ctx={makeGuestRowContext({
          onCheckIn: cy.spy().as("onCheckIn"),
          ...ctx,
        })}
        blockedHintId={blockedHintId}
      />
    </div>,
  );
}

const describedBy = ($el: JQuery<HTMLElement>) =>
  $el[0].ownerDocument.getElementById($el.attr("aria-describedby") ?? "")
    ?.textContent;

describe("<CheckInButton />", () => {
  it("checks the guest in", () => {
    mount();
    cy.getBySel("guest-check-in").should("have.text", "Check in").click();
    cy.get("@onCheckIn").should("have.been.calledOnceWith", LUNA);
  });

  it("renders nothing once the guest is in", () => {
    mount({}, makeMeetupGuest({ rsvp: { has_arrived: true } }));
    cy.getBySel("guest-check-in").should("not.exist");
  });

  it("waits for a fee, with a hidden reason of its own", () => {
    mount({ requiresPayment: true });
    cy.getBySel("guest-check-in")
      .should("be.disabled")
      .should(($b) =>
        expect(describedBy($b)).to.equal(
          "This guest has to pay the entrance fee first",
        ),
      );
  });

  it("points at a visible line instead when the card has one", () => {
    cy.mount(
      <>
        <p id="unpaid-line">Entrance fee not paid</p>
        <CheckInButton
          guest={LUNA}
          ctx={makeGuestRowContext({ requiresPayment: true })}
          blockedHintId="unpaid-line"
        />
      </>,
    );
    cy.getBySel("guest-check-in").should(
      "have.attr",
      "aria-describedby",
      "unpaid-line",
    );
  });

  it("waits while the meetup's payment rule is unknown", () => {
    mount({ paymentStateKnown: false });
    cy.getBySel("guest-check-in").should("be.disabled");
  });

  it("lets an exempt guest in on a paid meetup", () => {
    mount(
      { requiresPayment: true },
      makeMeetupGuest({ rsvp: { guest_type: "STAFF" } }),
    );
    cy.getBySel("guest-check-in").should("be.enabled");
  });

  it("is disabled with a reason on a finalized meetup", () => {
    mount({ isFinalized: true });
    cy.getBySel("guest-check-in")
      .should("be.disabled")
      .should(($b) =>
        expect(describedBy($b)).to.equal("This meetup is finalized"),
      );
  });

  it("says which guest is checking in and holds the others", () => {
    mount({ checkingInId: "g-luna" });
    cy.getBySel("guest-check-in")
      .should("have.text", "Checking in…")
      .and("be.disabled");
    mount({ checkingInId: "someone-else" });
    cy.getBySel("guest-check-in")
      .should("have.text", "Check in")
      .and("be.disabled");
  });

  it("is reachable by keyboard", () => {
    cy.mount(
      <>
        <input aria-label="before" data-cy="before" />
        <CheckInButton guest={LUNA} ctx={makeGuestRowContext()} />
      </>,
    );
    cy.getBySel("before").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "guest-check-in");
  });

  it("has no accessibility violations when blocked", () => {
    mount({ requiresPayment: true });
    cy.checkA11yAA('[data-cy="cell"]');
  });
});
