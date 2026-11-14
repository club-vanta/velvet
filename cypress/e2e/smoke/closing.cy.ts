import { loginAsSeeded, seedBackend } from "../../support/smoke";

// Real backend: the owner closes "E2E Closing" at the end of the night.
describe("Smoke: closing a meetup against the backend", () => {
  it("finalizes the meetup, which stays read-only after a reload", () => {
    seedBackend().then(({ meetups }) => {
      const { id, name, guest_ids } = meetups.closing;

      loginAsSeeded("owner");
      cy.visit(`/meetups/${id}`);
      cy.getBySel("meetup-finalize")
        .should("have.text", "Finalize meetup")
        .click();
      cy.getBySel("finalize-dialog")
        .findBySel("finalize-summary")
        .should("have.text", "0 of 2 checked in. 2 never arrived.");
      cy.getBySel("finalize-dialog").findBySel("dialog-confirm").click();
      cy.getBySel("finalize-dialog").should("not.exist");

      cy.reload();
      cy.getByRole("heading", { name }).should("be.visible");
      cy.getBySel("meetup-badge-finalized").should("have.text", "Finalized");
      cy.getBySel("meetup-finalized-note").should(
        "contain.text",
        "Check-ins, walk-ins, sync, and payments are closed.",
      );
      cy.getBySel("meetup-finalize").should("have.text", "Reopen meetup");
      cy.getBySel("meetup-sync").should("not.exist");
      cy.getBySel("meetup-add-walkin").should("not.exist");
      cy.getBySel(`guest-row-${guest_ids.luna}`)
        .findBySel("guest-check-in")
        .should("be.disabled");
    });
  });
});
