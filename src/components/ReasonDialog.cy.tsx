import { ReasonDialog } from "./ReasonDialog";

function mount(isPending = false) {
  cy.mount(
    <ReasonDialog
      data-cy="reason-dialog"
      title="Undo something?"
      placeholder="e.g. Wrong guest"
      confirmLabel="Confirm"
      pendingLabel="Confirming…"
      isPending={isPending}
      onConfirm={cy.spy().as("onConfirm")}
      onClose={cy.spy().as("onClose")}
    />,
  );
}

describe("<ReasonDialog />", () => {
  it("asks for at least 5 and at most 500 characters", () => {
    mount();
    cy.getByRole("dialog", { name: "Undo something?", native: false }).should(
      "be.visible",
    );
    cy.getByRole("textbox", { name: "Reason (required)" }).should(
      "have.attr",
      "placeholder",
      "e.g. Wrong guest",
    );
    cy.getBySel("dialog-confirm").should("be.disabled");
    cy.getBySel("reason-input").type("abcd");
    cy.getBySel("reason-count").should("have.text", "4/500");
    cy.getBySel("dialog-confirm").should("be.disabled");
    cy.getBySel("reason-input").type("e");
    cy.getBySel("dialog-confirm").should("be.enabled");
    cy.getBySel("reason-input").clear();
    cy.getBySel("reason-input").type("a".repeat(501), { delay: 0 });
    cy.getBySel("reason-count").should("have.text", "501/500");
    cy.getBySel("dialog-confirm").should("be.disabled");
  });

  it("does not count surrounding whitespace", () => {
    mount();
    cy.getBySel("reason-input").type("          ");
    cy.getBySel("reason-count").should("have.text", "0/500");
    cy.getBySel("dialog-confirm").should("be.disabled");
  });

  it("confirms with the trimmed reason", () => {
    mount();
    cy.getBySel("reason-input").type("   a valid reason   ");
    cy.getBySel("dialog-confirm").click();
    cy.get("@onConfirm").should("have.been.calledOnceWith", "a valid reason");
  });

  it("waits while pending", () => {
    mount(true);
    cy.getBySel("reason-input").type("a valid reason");
    cy.getBySel("dialog-confirm")
      .should("have.text", "Confirming…")
      .and("be.disabled");
  });

  it("closes from Cancel and from Escape", () => {
    mount();
    cy.getBySel("dialog-cancel").click();
    cy.get("@onClose").should("have.been.calledOnce");
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.get("@onClose").should("have.been.calledTwice");
  });

  it("has no accessibility violations", () => {
    mount();
    cy.getBySel("reason-dialog").should("have.css", "opacity", "1");
    cy.checkA11yAA('[data-cy="reason-dialog"]');
  });
});
