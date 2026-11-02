import {
  NOCTURNA,
  VANTA,
  stubAllOrganizations,
  stubOrganization,
  stubOrganizationDetail,
} from "../../support/routes/organizations";
import { stubDashboard } from "../../support/routes/dashboard";

describe("Organizations list", () => {
  context("as a site admin", () => {
    beforeEach(() => {
      cy.loginAs("siteAdmin");
    });

    it("lists every organization and opens one", () => {
      stubAllOrganizations();
      cy.visit("/organizations");
      cy.wait("@getOrgs");

      cy.getByRole("heading", { name: "Organizations" }).should("be.visible");
      cy.getBySelLike("org-row-").should("have.length", 2);
      cy.getBySel(`org-row-${NOCTURNA.id}`).within(() => {
        cy.getBySel("org-name").should("have.text", "Nocturna");
        cy.getBySel("org-slug").should("have.text", "nocturna");
      });
      cy.getBySel("org-create").should("have.text", "Create");

      stubOrganizationDetail(NOCTURNA);
      cy.getBySel(`org-row-${NOCTURNA.id}`).click();
      cy.wait(["@getOrg", "@getMembers"]);
      cy.location("pathname").should("eq", `/organizations/${NOCTURNA.id}`);
      cy.getByRole("heading", { name: "Nocturna" }).should("be.visible");
    });

    it("invites the first organization when there is none", () => {
      stubAllOrganizations([]);
      cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } });
      cy.visit("/organizations");
      cy.wait("@getOrgs");

      cy.getBySel("orgs-empty").should(
        "have.text",
        "No organizations yet. Create the first one.",
      );
      cy.getBySelLike("org-row-").should("not.exist");
    });

    it("shows placeholders while the organizations load", () => {
      stubAllOrganizations(undefined, { delay: 1000 });
      cy.visit("/organizations");

      cy.getBySel("org-row-loading").should("have.length", 3);
      cy.getBySel("orgs-empty").should("not.exist");
      cy.wait("@getOrgs");
      cy.getBySel("org-row-loading").should("not.exist");
      cy.getBySelLike("org-row-").should("have.length", 2);
    });

    it("shows an error with a retry when the list fails to load", () => {
      cy.stubApiError("GET", "/organizations/", { statusCode: 500 }).as(
        "getOrgs",
      );
      cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } });
      cy.visit("/organizations");
      cy.wait("@getOrgs");

      cy.getBySel("orgs-error").should(
        "contain.text",
        "Failed to load organizations",
      );
      stubAllOrganizations();
      cy.getBySel("orgs-error").within(() => {
        cy.getByRole("button", { name: "Retry" }).click();
      });
      cy.wait("@getOrgs");
      cy.getBySel("orgs-error").should("not.exist");
      cy.getBySelLike("org-row-").should("have.length", 2);
    });

    it("has no accessibility violations", () => {
      stubAllOrganizations();
      cy.visit("/organizations");
      cy.wait("@getOrgs");
      cy.getBySelLike("org-row-").should("have.length", 2);
      cy.checkA11yAA();
    });
  });

  context("as an org admin", () => {
    beforeEach(() => {
      cy.loginAs("orgAdmin");
    });

    it("lists only their own organizations, without Create", () => {
      stubOrganization(VANTA);
      cy.visit("/organizations");
      cy.wait("@getOrg");

      cy.getBySelLike("org-row-")
        .should("have.length", 1)
        .and("have.attr", "data-cy", `org-row-${VANTA.id}`);
      cy.getBySel("org-name").should("have.text", "Club Vanta");
      cy.getBySel("org-create").should("not.exist");
    });
  });

  context("as door staff", () => {
    it("cannot reach the organizations pages", () => {
      cy.loginAs("staff");
      stubDashboard();
      cy.visit("/organizations");
      cy.location("pathname").should("eq", "/dashboard");
      cy.getByRole("link", { name: "Organizations" }).should("not.exist");

      cy.visit(`/organizations/${VANTA.id}`);
      cy.location("pathname").should("eq", "/dashboard");
    });
  });
});
