import {
  NOCTURNA,
  VANTA,
  stubAllOrganizations,
} from "../../support/routes/organizations";
import { makeOrg } from "../../../src/tests/factories";

const created = makeOrg({ id: "org-3", name: "Umbra", slug: "umbra" });

function openCreateDialog() {
  cy.getBySel("org-create").click();
  return cy.getBySel("org-create-dialog").should("be.visible");
}

describe("Creating an organization", () => {
  beforeEach(() => {
    cy.loginAs("siteAdmin");
    stubAllOrganizations();
    cy.visit("/organizations");
    cy.wait("@getOrgs");
  });

  it("creates an organization and adds it to the list", () => {
    cy.stubApi("POST", "/organizations/", {
      body: created,
      statusCode: 201,
    }).as("createOrg");

    openCreateDialog().within(() => {
      cy.getByRole("textbox", { name: "Name" })
        .should("have.attr", "placeholder", "Club Vanta")
        .type("  Umbra ");
      cy.getByRole("textbox", { name: "Slug" }).type("umbra ");
      stubAllOrganizations([VANTA, NOCTURNA, created]);
      cy.getBySel("org-create-submit").should("have.text", "Create").click();
    });

    cy.wait("@createOrg")
      .its("request.body")
      .should("deep.equal", { name: "Umbra", slug: "umbra" });
    cy.contains("[data-sonner-toast]", "Organization created").should(
      "be.visible",
    );
    cy.getBySel("org-create-dialog").should("not.exist");
    cy.wait("@getOrgs");
    cy.getBySel(`org-row-${created.id}`)
      .findBySel("org-name")
      .should("have.text", "Umbra");
  });

  it("needs both a name and a slug", () => {
    openCreateDialog().within(() => {
      cy.getBySel("org-create-submit").should("be.disabled");
      cy.getByRole("textbox", { name: "Name" }).type("Umbra");
      cy.getBySel("org-create-submit").should("be.disabled");
      cy.getByRole("textbox", { name: "Slug" }).type("   ");
      cy.getBySel("org-create-submit").should("be.disabled");
      cy.getByRole("textbox", { name: "Slug" }).type("umbra");
      cy.getBySel("org-create-submit").should("be.enabled");
    });
  });

  it("keeps the dialog open with the reason when the slug is taken", () => {
    cy.stubApiError("POST", "/organizations/", {
      statusCode: 409,
      detail: "An organization with slug 'nocturna' already exists",
    }).as("createOrg");

    openCreateDialog().within(() => {
      cy.getByRole("textbox", { name: "Name" }).type("Nocturna 2");
      cy.getByRole("textbox", { name: "Slug" }).type("nocturna");
      cy.getBySel("org-create-submit").click();
    });

    cy.wait("@createOrg");
    cy.contains(
      "[data-sonner-toast]",
      "An organization with slug 'nocturna' already exists",
    ).should("have.attr", "data-type", "error");
    cy.getBySel("org-create-dialog").within(() => {
      cy.getByRole("textbox", { name: "Slug" }).should(
        "have.value",
        "nocturna",
      );
      cy.getBySel("org-create-submit").should("be.enabled");
    });
  });

  it("closes without creating anything on cancel", () => {
    openCreateDialog().within(() => {
      cy.getByRole("textbox", { name: "Name" }).type("Umbra");
      cy.getByRole("button", { name: "Cancel" }).click();
    });
    cy.getBySel("org-create-dialog").should("not.exist");
    cy.getBySelLike("org-row-").should("have.length", 2);
  });

  it("has no accessibility violations in the dialog", () => {
    openCreateDialog();
    cy.checkA11yAA();
  });
});
