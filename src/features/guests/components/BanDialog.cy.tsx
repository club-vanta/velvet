import { makeBannedGuest } from "@/tests/factories";
import { BanDialog } from "./BanDialog";

const GUEST = { id: "g-1", displayname: "Luna" };

describe("<BanDialog />", () => {
  beforeEach(() => {
    cy.mount(
      <BanDialog
        guest={GUEST}
        orgId="org-1"
        onClose={cy.spy().as("onClose")}
      />,
      { as: "orgAdmin" },
    );
  });

  it("asks about this guest, in English and Spanish", () => {
    cy.getByRole("dialog", { name: "Vant Luna?", native: false }).should(
      "be.visible",
    );
    cy.mount(<BanDialog guest={GUEST} orgId="org-1" onClose={() => {}} />, {
      as: "orgAdmin",
      lang: "es",
    });
    cy.getByRole("dialog", { name: "¿Vantear a Luna?", native: false }).should(
      "be.visible",
    );
  });

  it("vants in the org with the trimmed reason, then closes", () => {
    cy.stubApi("PATCH", "/organizations/{org_id}/guests/{guest_id}/ban", {
      body: makeBannedGuest({ id: "g-1" }),
      params: { org_id: "org-1", guest_id: "g-1" },
    }).as("ban");
    cy.getByRole("button", { name: "Vant guest" }).should("be.disabled");
    cy.getByRole("textbox", { name: "Reason (required)" }).type(
      "  Harassed another guest ",
    );
    cy.getByRole("button", { name: "Vant guest" }).click();

    cy.wait("@ban")
      .its("request.body")
      .should("deep.equal", { reason: "Harassed another guest" });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("stays open when the backend refuses", () => {
    cy.stubApiError("PATCH", "/organizations/{org_id}/guests/{guest_id}/ban", {
      statusCode: 409,
    }).as("ban");
    cy.getByRole("textbox", { name: "Reason (required)" }).type("Harassment");
    cy.getByRole("button", { name: "Vant guest" }).click();

    cy.wait("@ban");
    cy.get("@onClose").should("not.have.been.called");
    cy.getByRole("button", { name: "Vant guest" }).should("be.enabled");
  });
});
