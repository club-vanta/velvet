import {
  NOCTURNA,
  VANTA,
  stubAllOrganizations,
  stubMembers,
  stubOrganization,
  stubOrganizationDetail,
} from "../../support/routes/organizations";

const renamed = { ...VANTA, name: "Vanta Club" };

function openEditDialog() {
  cy.getBySel("org-edit").click();
  return cy.getBySel("org-edit-dialog").should("be.visible");
}

describe("Organization detail", () => {
  context("as a site admin", () => {
    beforeEach(() => {
      cy.loginAs("siteAdmin");
      stubOrganizationDetail();
      cy.visit(`/organizations/${VANTA.id}`);
      cy.wait(["@getOrg", "@getMembers"]);
    });

    it("shows the organization's name and slug", () => {
      cy.getByRole("heading", { name: "Club Vanta" }).should("be.visible");
      cy.getBySel("org-slug").should("have.text", "club-vanta");
      cy.getBySel("org-edit").should("have.text", "Edit organization");
    });

    it("renames the organization, sending only what changed", () => {
      cy.stubApi("PATCH", "/organizations/{org_id}", {
        body: renamed,
        params: { org_id: VANTA.id },
      }).as("updateOrg");

      openEditDialog().within(() => {
        cy.getBySel("org-edit-submit").should("be.disabled");
        cy.getByRole("textbox", { name: "Name" })
          .should("have.value", "Club Vanta")
          .type("{selectall}Vanta Club ");
        stubOrganization(renamed);
        stubAllOrganizations([renamed]);
        cy.getBySel("org-edit-submit").should("have.text", "Save").click();
      });

      cy.wait("@updateOrg")
        .its("request.body")
        .should("deep.equal", { name: "Vanta Club", slug: null });
      cy.contains("[data-sonner-toast]", "Organization updated").should(
        "be.visible",
      );
      cy.getBySel("org-edit-dialog").should("not.exist");
      // The page and the org switcher both show the new name.
      cy.wait(["@getOrg", "@getOrgs"]);
      cy.getByRole("heading", { name: "Vanta Club" }).should("be.visible");
    });

    it("changes the slug alone", () => {
      cy.stubApi("PATCH", "/organizations/{org_id}", {
        body: { ...VANTA, slug: "vanta" },
      }).as("updateOrg");

      openEditDialog().within(() => {
        cy.getByRole("textbox", { name: "Slug" }).type("{selectall}vanta");
        cy.getBySel("org-edit-submit").click();
      });

      cy.wait("@updateOrg")
        .its("request.body")
        .should("deep.equal", { name: null, slug: "vanta" });
    });

    it("cannot save an empty name or a name that did not change", () => {
      openEditDialog().within(() => {
        cy.getByRole("textbox", { name: "Name" }).clear();
        cy.getBySel("org-edit-submit").should("be.disabled");
        cy.getByRole("textbox", { name: "Name" }).type("Club Vanta ");
        cy.getBySel("org-edit-submit").should("be.disabled");
        cy.getByRole("textbox", { name: "Name" }).type("2");
        cy.getBySel("org-edit-submit").should("be.enabled");
      });
    });

    it("keeps the dialog open with the reason when the slug is taken", () => {
      cy.stubApiError("PATCH", "/organizations/{org_id}", {
        statusCode: 409,
        detail: "An organization with slug 'nocturna' already exists",
      }).as("updateOrg");

      openEditDialog().within(() => {
        cy.getByRole("textbox", { name: "Slug" }).type("{selectall}nocturna");
        cy.getBySel("org-edit-submit").click();
      });

      cy.wait("@updateOrg");
      cy.contains(
        "[data-sonner-toast]",
        "An organization with slug 'nocturna' already exists",
      ).should("have.attr", "data-type", "error");
      cy.getBySel("org-edit-dialog").within(() => {
        cy.getByRole("textbox", { name: "Slug" }).should(
          "have.value",
          "nocturna",
        );
        cy.getBySel("org-edit-submit").should("be.enabled");
      });
    });

    it("has no accessibility violations, with and without the edit dialog", () => {
      cy.getBySelLike("org-member-row-").should("have.length", 3);
      cy.checkA11yAA();
      openEditDialog();
      cy.checkA11yAA();
    });

    it("goes back to the list", () => {
      stubAllOrganizations();
      cy.getByRole("button", { name: "Back to organizations" }).click();
      cy.location("pathname").should("eq", "/organizations");
    });
  });

  it("starts fresh when the route moves to another organization", () => {
    cy.loginAs("siteAdmin");
    stubOrganizationDetail(VANTA);
    stubOrganizationDetail(NOCTURNA);
    cy.stubApi("GET", "/users/", { body: [] });
    cy.visit(`/organizations/${VANTA.id}`);
    cy.getByRole("heading", { name: "Club Vanta" }).should("be.visible");
    cy.getBySel("org-add-member").click();
    cy.getBySel("org-member-search").type("sol");

    // Back/forward or a link to another org keeps the same route element.
    cy.window().then((win) => {
      win.history.pushState({}, "", `/organizations/${NOCTURNA.id}`);
      win.dispatchEvent(new PopStateEvent("popstate"));
    });

    cy.getByRole("heading", { name: "Nocturna" }).should("be.visible");
    cy.getBySel("org-add-member-dialog").should("not.exist");
  });

  context("as an org admin", () => {
    beforeEach(() => {
      cy.loginAs("orgAdmin");
    });

    it("can see the organization but not edit it", () => {
      stubOrganizationDetail();
      cy.visit(`/organizations/${VANTA.id}`);
      cy.wait(["@getOrg", "@getMembers"]);

      cy.getByRole("heading", { name: "Club Vanta" }).should("be.visible");
      cy.getBySel("org-edit").should("not.exist");
      cy.getBySel("org-add-member").should("be.visible");
    });

    it("shows placeholders while the organization loads", () => {
      cy.stubApi("GET", "/organizations/{org_id}", {
        body: VANTA,
        delay: 1000,
      }).as("getOrg");
      stubMembers();
      cy.visit(`/organizations/${VANTA.id}`);

      cy.getBySel("org-loading").should("be.visible");
      cy.wait("@getOrg");
      cy.getBySel("org-loading").should("not.exist");
      cy.getByRole("heading", { name: "Club Vanta" }).should("be.visible");
    });

    it("says so when the organization cannot be loaded", () => {
      cy.stubApiError("GET", "/organizations/{org_id}", {
        statusCode: 403,
        detail: "Not a member of this organization",
      }).as("getOrg");
      cy.stubApiError("GET", "/organizations/{org_id}/members", {
        statusCode: 403,
        detail: "Not a member of this organization",
      }).as("getMembers");
      cy.visit("/organizations/org-other");
      cy.wait(["@getOrg", "@getMembers"]);

      cy.getBySel("org-error").should(
        "have.text",
        "Failed to load organizations",
      );
      cy.getBySel("org-members-error").should("be.visible");
      cy.getBySel("org-edit").should("not.exist");
    });
  });
});
