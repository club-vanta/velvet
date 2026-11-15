import { makeOrg } from "@/tests/factories";
import { CreateOrgDialog } from "./CreateOrgDialog";

describe("<CreateOrgDialog />", () => {
  beforeEach(() => {
    cy.mount(<CreateOrgDialog onClose={cy.spy().as("onClose")} />, {
      as: "siteAdmin",
    });
  });

  it("creates the org with trimmed values, then closes", () => {
    cy.stubApi("POST", "/organizations/", {
      body: makeOrg({ id: "org-3", name: "Umbra", slug: "umbra" }),
      statusCode: 201,
      delay: 200,
    }).as("createOrg");

    cy.getByRole("textbox", { name: "Name" }).type(" Umbra ");
    cy.getByRole("textbox", { name: "Slug" }).type("umbra");
    cy.getBySel("org-create-submit").click();
    cy.getBySel("org-create-submit")
      .should("have.text", "Creating…")
      .and("be.disabled");

    cy.wait("@createOrg")
      .its("request.body")
      .should("deep.equal", { name: "Umbra", slug: "umbra" });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("stays open when the backend refuses", () => {
    cy.stubApiError("POST", "/organizations/", {
      statusCode: 409,
      detail: "Slug taken",
    }).as("createOrg");

    cy.getByRole("textbox", { name: "Name" }).type("Umbra");
    cy.getByRole("textbox", { name: "Slug" }).type("umbra");
    cy.getBySel("org-create-submit").click();

    cy.wait("@createOrg");
    cy.getBySel("org-create-submit").should("be.enabled");
    cy.get("@onClose").should("not.have.been.called");
  });

  it("needs a name and a slug", () => {
    cy.getBySel("org-create-submit").should("be.disabled");
    cy.getByRole("textbox", { name: "Name" }).type("Umbra");
    cy.getBySel("org-create-submit").should("be.disabled");
    cy.getByRole("textbox", { name: "Slug" }).type("umbra");
    cy.getBySel("org-create-submit").should("be.enabled");
  });

  it("goes from name to slug to the buttons with the keyboard", () => {
    cy.getByRole("textbox", { name: "Name" }).focus();
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "org-slug-input");
  });

  it("has no accessibility violations", () => {
    cy.getBySel("org-create-dialog").should("be.visible");
    cy.checkA11yAA();
  });
});
