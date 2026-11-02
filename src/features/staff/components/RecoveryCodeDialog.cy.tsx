import { makeRecoveryCode, makeStaffUser } from "@/tests/factories";
import { RecoveryCodeDialog } from "./RecoveryCodeDialog";

const luz = makeStaffUser({ id: 10, username: "luz" });

function mountDialog() {
  cy.mount(<RecoveryCodeDialog user={luz} onClose={cy.spy().as("onClose")} />);
}

describe("<RecoveryCodeDialog />", () => {
  it("asks before generating a code for the account", () => {
    mountDialog();
    cy.getByRole("dialog", {
      name: "Generate recovery code for luz",
      native: false,
    }).should("be.visible");
    cy.getBySel("staff-recovery-generate").should("have.text", "Generate code");
    cy.getByRole("button", { name: "Cancel" }).click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("shows the code in a large monospace type once generated", () => {
    cy.stubApi("POST", "/staff/{user_id}/recovery-code", {
      body: makeRecoveryCode({ code: "999000" }),
      params: { user_id: "10" },
      delay: 200,
    }).as("generate");
    mountDialog();

    cy.getBySel("staff-recovery-generate").click();
    cy.getBySel("staff-recovery-generate")
      .should("have.text", "Generating…")
      .and("be.disabled");
    cy.wait("@generate");
    cy.getBySel("staff-recovery-code")
      .should("have.text", "999000")
      .and("have.css", "font-family")
      .and("match", /mono/i);
    cy.getBySel("staff-recovery-close").click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes when the code cannot be generated", () => {
    cy.stubApiError("POST", "/staff/{user_id}/recovery-code", {
      statusCode: 500,
    }).as("generate");
    mountDialog();

    cy.getBySel("staff-recovery-generate").click();
    cy.wait("@generate");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("moves focus into the dialog and closes on Escape", () => {
    mountDialog();
    cy.focused()
      .closest("[data-cy=staff-recovery-dialog]")
      .should("have.length", 1);
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("has no accessibility violations", () => {
    mountDialog();
    cy.getBySel("staff-recovery-dialog").should("be.visible");
    cy.checkA11yAA();
  });
});
