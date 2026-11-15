import { makeGuest } from "@/tests/factories";
import { WalkinCandidate } from "./WalkinCandidate";

function mount(guest = makeGuest(), disabled = false) {
  cy.mount(
    <WalkinCandidate
      guest={guest}
      disabled={disabled}
      onAdd={cy.spy().as("onAdd")}
    />,
  );
}

describe("<WalkinCandidate />", () => {
  it("shows the guest and adds them", () => {
    mount();
    cy.getBySel("walkin-name").should("have.text", "Luna");
    cy.getBySel("walkin-candidate-guest-1").should("contain.text", "@luna");
    cy.getByRole("button", { name: "Add" }).click();
    cy.get("@onAdd").should("have.been.calledOnce");
    cy.checkA11yAA('[data-cy="walkin-candidate-guest-1"]');
  });

  it("says when the guest has no Mazmo account", () => {
    mount(makeGuest({ mazmo_handle: null, mazmo_user_id: null }));
    cy.getBySel("walkin-candidate-guest-1").should(
      "contain.text",
      "No Mazmo account",
    );
  });

  it("waits while another walk-in is being added", () => {
    mount(makeGuest(), true);
    cy.getBySel("walkin-add").should("be.disabled");
  });
});
