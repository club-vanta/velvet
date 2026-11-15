import { loginAsSeeded, seedBackend } from "../../support/smoke";

// Real backend: the door flow on "E2E Door", a paid meetup. Recording the fee
// is an admin action, so the owner records it and the door staff checks the
// guest in, as at a real night.
describe("Smoke: the door against the backend", () => {
  it("records Luna's fee, checks her in, and keeps both after a reload", () => {
    seedBackend().then(({ meetups }) => {
      const { id, guest_ids } = meetups.door;
      const luna = () => cy.getBySel(`guest-row-${guest_ids.luna}`);

      loginAsSeeded("owner");
      cy.visit(`/meetups/${id}`);
      luna().findBySel("guest-check-in").should("be.disabled");
      luna().findBySel("guest-mark-paid").click();
      cy.getBySel("mark-paid-dialog").findBySel("dialog-confirm").click();
      cy.getBySel("mark-paid-dialog").should("not.exist");
      luna().findBySel("guest-payment-status").should("contain.text", "Paid");

      loginAsSeeded("door");
      cy.visit(`/meetups/${id}`);
      luna().findBySel("guest-check-in").should("be.enabled").click();
      luna()
        .findBySel("guest-check-in-status")
        .should("contain.text", "✓ Checked in");

      cy.reload();
      luna().within(() => {
        cy.getBySel("guest-check-in-status").should(
          "contain.text",
          "✓ Checked in",
        );
        cy.getBySel("guest-arrival-order").should("have.text", "#1");
        cy.getBySel("guest-payment-status").should("contain.text", "Paid");
        cy.getBySel("guest-check-in").should("not.exist");
      });
    });
  });
});
