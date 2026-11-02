import { makeOrg } from "@/tests/factories";
import { EditOrgDialog } from "./EditOrgDialog";

const org = makeOrg({ name: "Club Vanta", slug: "club-vanta" });

describe("<EditOrgDialog />", () => {
  beforeEach(() => {
    cy.mount(<EditOrgDialog org={org} onClose={cy.spy().as("onClose")} />, {
      as: "siteAdmin",
    });
  });

  it("starts from the current values with Save disabled", () => {
    cy.getByRole("textbox", { name: "Name" }).should(
      "have.value",
      "Club Vanta",
    );
    cy.getByRole("textbox", { name: "Slug" }).should(
      "have.value",
      "club-vanta",
    );
    cy.getBySel("org-edit-submit").should("be.disabled");
  });

  it("saves only the changed field, then closes", () => {
    cy.stubApi("PATCH", "/organizations/{org_id}", {
      body: { ...org, slug: "vanta" },
      params: { org_id: org.id },
    }).as("updateOrg");

    cy.getByRole("textbox", { name: "Slug" }).clear().type("vanta");
    cy.getBySel("org-edit-submit").click();

    cy.wait("@updateOrg")
      .its("request.body")
      .should("deep.equal", { name: null, slug: "vanta" });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("closes without saving on cancel", () => {
    cy.getByRole("textbox", { name: "Name" }).type(" 2");
    cy.getByRole("button", { name: "Cancel" }).click();
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("has no accessibility violations", () => {
    cy.getBySel("org-edit-dialog").should("be.visible");
    cy.checkA11yAA();
  });
});
