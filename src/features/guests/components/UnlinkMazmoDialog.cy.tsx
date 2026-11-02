import { makeGuest } from "@/tests/factories";
import { UnlinkMazmoDialog } from "./UnlinkMazmoDialog";

const LUNA = makeGuest({
  id: "g-1",
  displayname: "Luna",
  mazmo_handle: "luna",
});

describe("<UnlinkMazmoDialog />", () => {
  beforeEach(() => {
    cy.mount(
      <UnlinkMazmoDialog guest={LUNA} onClose={cy.spy().as("onClose")} />,
      { as: "staff" },
    );
  });

  it("names the guest and account it unlinks", () => {
    cy.getByRole("dialog", { name: "Unlink Mazmo account?", native: false });
    cy.getBySel("unlink-mazmo-body").should(
      "have.text",
      "This removes the Mazmo link from Luna (@luna).",
    );
  });

  it("unlinks and closes", () => {
    cy.stubApi("PATCH", "/guests/{guest_id}/unlink-mazmo", {
      body: LUNA,
      params: { guest_id: "g-1" },
    }).as("unlink");
    cy.getBySel("unlink-mazmo-dialog-confirm")
      .should("have.text", "Unlink")
      .click();

    cy.wait("@unlink");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("stays open when the backend refuses", () => {
    cy.stubApiError("PATCH", "/guests/{guest_id}/unlink-mazmo", {
      statusCode: 409,
    }).as("unlink");
    cy.getBySel("unlink-mazmo-dialog-confirm").click();

    cy.wait("@unlink");
    cy.get("@onClose").should("not.have.been.called");
  });

  it("uses Spanish copy", () => {
    cy.mount(<UnlinkMazmoDialog guest={LUNA} onClose={() => {}} />, {
      as: "staff",
      lang: "es",
    });
    cy.getBySel("unlink-mazmo-body").should(
      "have.text",
      "Esto quita el vínculo de Mazmo de Luna (@luna).",
    );
  });
});
