import { GuestActionDialog } from "./GuestActionDialog";

function mount({ canConfirm = true, isPending = false } = {}) {
  cy.mount(
    <GuestActionDialog
      data-cy="test-dialog"
      title="Edit guest"
      confirmLabel="Save changes"
      pendingLabel="Saving…"
      isPending={isPending}
      canConfirm={canConfirm}
      onConfirm={cy.spy().as("onConfirm")}
      onClose={cy.spy().as("onClose")}
    >
      <p>Body</p>
    </GuestActionDialog>,
  );
}

describe("<GuestActionDialog />", () => {
  it("is a titled dialog that confirms", () => {
    mount();
    cy.getByRole("dialog", { name: "Edit guest", native: false }).should(
      "be.visible",
    );
    cy.getBySel("test-dialog-confirm")
      .should("have.text", "Save changes")
      .click();
    cy.get("@onConfirm").should("have.been.calledOnce");
  });

  it("can't confirm an incomplete form", () => {
    mount({ canConfirm: false });
    cy.getBySel("test-dialog-confirm").should("be.disabled");
  });

  it("shows the pending label and can't confirm twice", () => {
    mount({ isPending: true });
    cy.getBySel("test-dialog-confirm")
      .should("be.disabled")
      .and("have.text", "Saving…");
  });

  it("closes with Cancel and with Escape", () => {
    mount();
    cy.getByRole("button", { name: "Cancel" }).click();
    cy.get("@onClose").should("have.been.calledOnce");
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.get("@onClose").should("have.been.calledTwice");
    cy.get("@onConfirm").should("not.have.been.called");
  });

  it("has no accessibility violations", () => {
    mount();
    cy.getByRole("dialog", { native: false }).should(
      "have.css",
      "opacity",
      "1",
    );
    cy.checkA11yAA('[role="dialog"]');
  });
});
