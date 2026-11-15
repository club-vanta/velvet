import { ConfirmDialog } from "./ConfirmDialog";

function mount(props: { isPending?: boolean; destructive?: boolean } = {}) {
  cy.mount(
    <ConfirmDialog
      data-cy="confirm"
      title="Finalize Alter Night?"
      description="Nobody can check in afterwards."
      confirmLabel="Finalize"
      pendingLabel="Finalizing…"
      isPending={props.isPending ?? false}
      destructive={props.destructive}
      onConfirm={cy.spy().as("onConfirm")}
      onClose={cy.spy().as("onClose")}
    >
      <p data-cy="body">7 of 10 checked in.</p>
    </ConfirmDialog>,
  );
}

describe("<ConfirmDialog />", () => {
  it("names the dialog by its title and describes it", () => {
    mount();
    cy.getByRole("dialog", { name: "Finalize Alter Night?", native: false })
      .should("be.visible")
      .and("have.attr", "aria-describedby");
    cy.getBySel("body").should("have.text", "7 of 10 checked in.");
  });

  it("confirms and cancels", () => {
    mount();
    cy.getBySel("dialog-confirm").should("have.text", "Finalize").click();
    cy.get("@onConfirm").should("have.been.calledOnce");
    cy.getBySel("dialog-cancel").should("have.text", "Cancel").click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("waits while pending", () => {
    mount({ isPending: true });
    cy.getBySel("dialog-confirm")
      .should("have.text", "Finalizing…")
      .and("be.disabled");
  });

  it("puts focus inside the dialog and reaches both buttons by keyboard", () => {
    mount();
    cy.focused().closest("[data-cy=confirm]").should("exist");
    cy.getBySel("dialog-cancel").focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "dialog-confirm");
  });

  it("has no accessibility violations", () => {
    mount();
    cy.getBySel("confirm").should("have.css", "opacity", "1");
    cy.checkA11yAA('[data-cy="confirm"]');
  });
});
