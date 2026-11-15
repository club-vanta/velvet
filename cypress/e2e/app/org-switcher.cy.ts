import {
  ORG_ID,
  makeMeetup,
  makeMeetupStats,
  makeMembership,
  makeOrg,
  makeUser,
} from "../../../src/tests/factories";
import {
  stubDashboardPage,
  stubOrganizationsPage,
} from "../../support/routes/app";

const NORTE = makeOrg({ id: "org-2", name: "Club Norte", slug: "club-norte" });

/** Each org's dashboard lists one meetup named after the org. */
function stubMeetupsPerOrg() {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    params: { org_id: ORG_ID },
    body: {
      total: 1,
      meetups: [makeMeetup({ id: "m-1", name: "Vanta night" })],
    },
  }).as("vantaMeetups");
  cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
    params: { org_id: NORTE.id },
    body: {
      total: 1,
      meetups: [makeMeetup({ id: "m-2", name: "Norte night" })],
    },
  }).as("norteMeetups");
  // The dashboard features the latest meetup with its numbers.
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
    body: makeMeetupStats(),
  });
}

function switchTo(orgId: string) {
  cy.getBySel("shell-org-switcher").click();
  cy.getBySel(`shell-org-option-${orgId}`).click();
}

describe("Organization switcher", () => {
  context("for staff of two organizations", () => {
    beforeEach(() => {
      cy.loginAs("staff", {
        user: makeUser({
          org_memberships: [
            makeMembership(),
            makeMembership({ org_id: NORTE.id, org_name: NORTE.name }),
          ],
        }),
      });
      stubDashboardPage();
      stubMeetupsPerOrg();
    });

    it("names the active organization and lists both", () => {
      cy.visit("/dashboard");
      cy.getByRole("button", { name: "Organization: Club Vanta" }).click();
      cy.getByRole("menuitem", { name: "Club Vanta" }).should("be.visible");
      cy.getByRole("menuitem", { name: "Club Norte" }).should("be.visible");
      cy.checkA11yAA('[data-cy="shell-org-menu"]');
    });

    it("shows the other organization's data after switching", () => {
      cy.visit("/meetups");
      cy.wait("@vantaMeetups");

      switchTo(NORTE.id);

      cy.location("pathname").should("eq", "/dashboard");
      cy.wait("@norteMeetups");
      cy.getBySel("shell-active-org").should("have.text", "Club Norte");
      cy.contains("Norte night").should("be.visible");
      cy.contains("Vanta night").should("not.exist");
    });

    it("remembers the organization after a reload", () => {
      cy.visit("/dashboard");
      switchTo(NORTE.id);
      cy.getBySel("shell-active-org").should("have.text", "Club Norte");

      cy.reload();

      cy.wait("@norteMeetups");
      cy.getBySel("shell-active-org").should("have.text", "Club Norte");
      cy.window()
        .its("localStorage")
        .invoke("getItem", "active_org_id")
        .should("eq", NORTE.id);
    });

    it("falls back to the first organization when the stored one is gone", () => {
      cy.visit("/dashboard", {
        onBeforeLoad: (win) =>
          win.localStorage.setItem("active_org_id", "org-deleted"),
      });
      cy.getBySel("shell-active-org").should("have.text", "Club Vanta");
      cy.wait("@vantaMeetups");
    });
  });

  context("for a site admin", () => {
    beforeEach(() => {
      cy.loginAs("siteAdmin");
      stubDashboardPage();
      stubOrganizationsPage([makeOrg(), NORTE]);
      stubMeetupsPerOrg();
    });

    it("lists every organization and switches between them", () => {
      cy.visit("/dashboard");
      cy.wait("@organizations");
      cy.getBySel("shell-org-switcher").click();
      cy.getBySelLike("shell-org-option-").should("have.length", 2);
      cy.getBySel(`shell-org-option-${NORTE.id}`).click();

      cy.wait("@norteMeetups");
      cy.getBySel("shell-active-org").should("have.text", "Club Norte");
    });
  });

  context("for staff without an organization", () => {
    it("hides the switcher and says no organization is assigned", () => {
      cy.loginAs("staff", { user: makeUser({ org_memberships: [] }) });
      stubDashboardPage();
      cy.visit("/dashboard");
      cy.getBySel("shell-username").should("have.text", "door");
      cy.getBySel("shell-org-switcher").should("not.exist");
      cy.contains("No organization assigned. Contact an administrator.").should(
        "be.visible",
      );
    });
  });
});
