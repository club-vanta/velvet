import { makeDisabledUser, makeStaffUser } from "@/tests/factories";
import { DisableDialog } from "./DisableDialog";

const luz = makeStaffUser({ id: 10, username: "luz" });

describe("<DisableDialog />", () => {
  beforeEach(() => {
    cy.mount(<DisableDialog user={luz} onClose={cy.spy().as("onClose")} />);
  });

  it("disables the account with the trimmed reason, then closes", () => {
    cy.stubApi("PATCH", "/staff/{user_id}/disable", {
      body: makeDisabledUser({ id: 10 }),
      params: { user_id: "10" },
      delay: 200,
    }).as("disable");

    cy.getByRole("textbox", { name: "Reason (required)" }).type(
      " Left the club ",
    );
    cy.getByRole("button", { name: "Disable account" }).click();
    cy.getByRole("button", { name: "Disabling…" }).should("be.disabled");

    cy.wait("@disable")
      .its("request.body")
      .should("deep.equal", { reason: "Left the club" });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("stays open when the backend refuses", () => {
    cy.stubApiError("PATCH", "/staff/{user_id}/disable", {
      statusCode: 409,
      detail: "User is already disabled",
    }).as("disable");

    cy.getByRole("textbox", { name: "Reason (required)" }).type(
      "Left the club",
    );
    cy.getByRole("button", { name: "Disable account" }).click();

    cy.wait("@disable");
    cy.getByRole("button", { name: "Disable account" }).should("be.enabled");
    cy.get("@onClose").should("not.have.been.called");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("dialog", { name: "Disable luz?", native: false }).should(
      "be.visible",
    );
    cy.checkA11yAA();
  });
});
