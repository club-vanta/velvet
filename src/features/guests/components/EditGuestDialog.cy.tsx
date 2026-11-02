import { makeGuest } from "@/tests/factories";
import { EditGuestDialog } from "./EditGuestDialog";

const LUNA = makeGuest({
  id: "g-1",
  displayname: "Luna",
  instagram_username: "luna.ig",
});

describe("<EditGuestDialog />", () => {
  beforeEach(() => {
    cy.mount(
      <EditGuestDialog guest={LUNA} onClose={cy.spy().as("onClose")} />,
      { as: "staff" },
    );
  });

  it("starts from the current values", () => {
    cy.getByRole("textbox", { name: "Display Name" }).should(
      "have.value",
      "Luna",
    );
    cy.getByRole("textbox", { name: "Instagram (optional)" }).should(
      "have.value",
      "luna.ig",
    );
  });

  it("saves only what changed, then closes", () => {
    cy.stubApi("PATCH", "/guests/{guest_id}", {
      body: LUNA,
      params: { guest_id: "g-1" },
    }).as("edit");
    cy.getBySel("edit-guest-instagram").clear();
    cy.getBySel("edit-guest-dialog-confirm").click();

    cy.wait("@edit")
      .its("request.body")
      .should("deep.equal", { instagram_username: null });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("can't save a blank name", () => {
    cy.getBySel("edit-guest-displayname").clear();
    cy.getBySel("edit-guest-dialog-confirm").should("be.disabled");
  });

  it("stays open when saving fails", () => {
    cy.stubApiError("PATCH", "/guests/{guest_id}", { statusCode: 500 }).as(
      "edit",
    );
    cy.getBySel("edit-guest-dialog-confirm").click();

    cy.wait("@edit");
    cy.get("@onClose").should("not.have.been.called");
    cy.getBySel("edit-guest-displayname").should("be.enabled");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("dialog", { native: false }).should(
      "have.css",
      "opacity",
      "1",
    );
    cy.checkA11yAA('[role="dialog"]');
  });
});
