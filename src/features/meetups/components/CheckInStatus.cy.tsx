import { makeMeetupGuest } from "@/tests/factories";
import { formatDateTime } from "@/lib/format";
import { CheckInStatus } from "./CheckInStatus";

describe("<CheckInStatus />", () => {
  it("says a guest who is not in is pending", () => {
    cy.mount(
      <div data-cy="status">
        <CheckInStatus guest={makeMeetupGuest()} />
      </div>,
    );
    cy.getBySel("status").should("have.text", "Pending");
  });

  it("shows when the guest checked in", () => {
    const at = "2026-10-01T23:15:00Z";
    cy.mount(
      <div data-cy="status">
        <CheckInStatus
          guest={makeMeetupGuest({
            rsvp: { has_arrived: true, arrival_time: at },
          })}
        />
      </div>,
    );
    cy.getBySel("status").should(
      "have.text",
      `✓ Checked in${formatDateTime(at)}`,
    );
    cy.checkA11yAA('[data-cy="status"]');
  });
});
