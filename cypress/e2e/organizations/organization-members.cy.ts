import {
  MEMBERS,
  VANTA,
  stubMembers,
  stubOrganization,
  stubOrganizationDetail,
} from "../../support/routes/organizations";
import { USERS, makeOrgMember } from "../../../src/tests/factories";

const [owner, luz, mar] = MEMBERS;

function memberRow(userId: number) {
  return cy.getBySel(`org-member-row-${userId}`);
}

function chooseRole(username: string, role: "Staff" | "Admin") {
  cy.getByRole("combobox", {
    name: `Role of ${username}`,
    native: false,
  }).click();
  cy.getByRole("option", { name: role, native: false }).click();
}

describe("Organization members", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  context("with members loaded", () => {
    beforeEach(() => {
      stubOrganizationDetail();
      cy.visit(`/organizations/${VANTA.id}`);
      cy.wait(["@getOrg", "@getMembers"]);
    });

    it("lists the members with their roles, and locks the viewer's own row", () => {
      cy.getBySelLike("org-member-row-").should("have.length", 3);
      memberRow(luz.user_id).within(() => {
        cy.getBySel("org-member-username").should("have.text", "luz");
        cy.getBySel("org-member-role").should("be.enabled");
        cy.getBySel("org-member-role-value").should("have.text", "STAFF");
        cy.getBySel("org-member-remove")
          .should("have.text", "Remove")
          .and("be.enabled");
      });
      // owner is the signed-in org admin: no self-demotion, no self-removal.
      memberRow(USERS.orgAdmin.id).within(() => {
        cy.getBySel("org-member-role").should("be.disabled");
        cy.getBySel("org-member-remove").should("be.disabled");
      });
    });

    it("promotes a member to admin", () => {
      cy.stubApi("PATCH", "/organizations/{org_id}/members/{user_id}", {
        body: { ...luz, role: "ADMIN" },
        params: { org_id: VANTA.id, user_id: String(luz.user_id) },
      }).as("setRole");
      stubMembers([owner, { ...luz, role: "ADMIN" }, mar]);

      chooseRole("luz", "Admin");

      cy.wait("@setRole")
        .its("request.body")
        .should("deep.equal", { role: "ADMIN" });
      cy.contains("[data-sonner-toast]", "Role updated").should("be.visible");
      cy.wait("@getMembers");
      memberRow(luz.user_id)
        .findBySel("org-member-role-value")
        .should("have.text", "ADMIN");
    });

    it("keeps the role and shows the reason when the change is refused", () => {
      cy.stubApiError("PATCH", "/organizations/{org_id}/members/{user_id}", {
        statusCode: 403,
        detail: "Only admins can change roles",
      }).as("setRole");

      chooseRole("luz", "Admin");

      cy.wait("@setRole");
      cy.contains("[data-sonner-toast]", "Only admins can change roles").should(
        "have.attr",
        "data-type",
        "error",
      );
      memberRow(luz.user_id)
        .findBySel("org-member-role-value")
        .should("have.text", "STAFF");
    });

    it("removes a member", () => {
      cy.stubApi("DELETE", "/organizations/{org_id}/members/{user_id}", {
        body: undefined,
        statusCode: 204,
        params: { org_id: VANTA.id, user_id: String(mar.user_id) },
      }).as("removeMember");
      stubMembers([owner, luz]);

      memberRow(mar.user_id).findBySel("org-member-remove").click();

      cy.wait("@removeMember");
      cy.contains("[data-sonner-toast]", "Member removed").should("be.visible");
      cy.wait("@getMembers");
      memberRow(mar.user_id).should("not.exist");
      cy.getBySelLike("org-member-row-").should("have.length", 2);
    });

    it("marks only the member being removed while the request runs", () => {
      cy.stubApi("DELETE", "/organizations/{org_id}/members/{user_id}", {
        body: undefined,
        statusCode: 204,
        delay: 1000,
      }).as("removeMember");
      stubMembers([owner, luz]);

      memberRow(mar.user_id).findBySel("org-member-remove").click();

      memberRow(mar.user_id)
        .findBySel("org-member-remove")
        .should("have.text", "Removing…")
        .and("be.disabled");
      // One removal at a time, but the other rows keep their label.
      memberRow(luz.user_id)
        .findBySel("org-member-remove")
        .should("have.text", "Remove")
        .and("be.disabled");
      cy.wait("@removeMember");
      memberRow(luz.user_id)
        .findBySel("org-member-remove")
        .should("be.enabled");
    });

    it("keeps the member and shows the reason when removal is refused", () => {
      cy.stubApiError("DELETE", "/organizations/{org_id}/members/{user_id}", {
        statusCode: 404,
        detail: "User is not a member of this organization",
      }).as("removeMember");

      memberRow(mar.user_id).findBySel("org-member-remove").click();

      cy.wait("@removeMember");
      cy.contains(
        "[data-sonner-toast]",
        "User is not a member of this organization",
      ).should("have.attr", "data-type", "error");
      memberRow(mar.user_id)
        .findBySel("org-member-remove")
        .should("be.enabled")
        .and("have.text", "Remove");
    });
  });

  it("says so when the organization has no members", () => {
    stubOrganizationDetail(VANTA, []);
    cy.visit(`/organizations/${VANTA.id}`);
    cy.wait("@getMembers");

    cy.getBySel("org-members-empty").should("have.text", "No staff accounts.");
  });

  it("shows placeholders while the members load", () => {
    stubOrganization();
    stubMembers(MEMBERS, { delay: 1000 });
    cy.visit(`/organizations/${VANTA.id}`);

    cy.getBySel("org-member-row-loading").should("have.length", 3);
    cy.wait("@getMembers");
    cy.getBySel("org-member-row-loading").should("not.exist");
    cy.getBySelLike("org-member-row-").should("have.length", 3);
  });

  it("shows an error with a retry when the members fail to load", () => {
    stubOrganization();
    cy.stubApiError("GET", "/organizations/{org_id}/members", {
      statusCode: 500,
    }).as("getMembers");
    cy.visit(`/organizations/${VANTA.id}`);
    cy.wait("@getMembers");

    cy.getBySel("org-members-error").should("be.visible");
    stubMembers([makeOrgMember()]);
    cy.getBySel("org-members-error").within(() => {
      cy.getByRole("button", { name: "Retry" }).click();
    });
    cy.wait("@getMembers");
    cy.getBySel("org-members-error").should("not.exist");
    cy.getBySelLike("org-member-row-").should("have.length", 1);
  });
});
