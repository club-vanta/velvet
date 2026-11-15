import { formatDateTime } from "@/lib/format";
import { FinalizedNote } from "./FinalizedNote";

describe("<FinalizedNote />", () => {
  it("says when the meetup was finalized and what is closed", () => {
    const at = "2026-10-02T05:00:00Z";
    cy.mount(<FinalizedNote finalizedAt={at} />);
    cy.getBySel("meetup-finalized-on").should(
      "have.text",
      `Finalized on ${formatDateTime(at)}`,
    );
    cy.getBySel("meetup-finalized-note").should(
      "contain.text",
      "Check-ins, walk-ins, sync, and payments are closed.",
    );
    cy.checkA11yAA('[data-cy="meetup-finalized-note"]');
  });

  it("leaves the date out when there is none", () => {
    cy.mount(<FinalizedNote finalizedAt={null} />);
    cy.getBySel("meetup-finalized-on").should("not.exist");
    cy.getBySel("meetup-finalized-note").should(
      "have.text",
      "Check-ins, walk-ins, sync, and payments are closed.",
    );
  });
});
