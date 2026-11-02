import {
  MEMBERS,
  SEARCH_RESULTS,
  VANTA,
  stubMembers,
  stubOrganizationDetail,
  stubUserSearch,
} from "../../support/routes/organizations";
import { makeOrgMember } from "../../../src/tests/factories";

const sol = SEARCH_RESULTS[0];

function openAddMemberDialog() {
  cy.getBySel("org-add-member").click();
  return cy.getBySel("org-add-member-dialog").should("be.visible");
}

describe("Adding a member", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
    stubOrganizationDetail();
    stubUserSearch();
    cy.visit(`/organizations/${VANTA.id}`);
    cy.wait(["@getOrg", "@getMembers"]);
  });

  it("finds an account by username and adds it as an admin", () => {
    cy.stubApi("POST", "/organizations/{org_id}/members/{user_id}", {
      body: makeOrgMember({ user_id: sol.id, username: "sol", role: "ADMIN" }),
      statusCode: 201,
      params: { org_id: VANTA.id, user_id: String(sol.id) },
    }).as("addMember");

    openAddMemberDialog().within(() => {
      cy.getBySel("org-add-member-submit").should("be.disabled");
      cy.getByRole("textbox", { name: "Username" })
        .should("be.focused")
        .type("so");
      cy.getBySel(`org-member-result-${sol.id}`).click();
      cy.getByRole("textbox", { name: "Username" }).should("have.value", "sol");
      cy.getBySel(`org-member-result-${sol.id}`).should(
        "have.attr",
        "aria-pressed",
        "true",
      );
      cy.getBySel("org-add-member-role-value").should("have.text", "STAFF");
    });
    cy.getByRole("combobox", { name: "Role", native: false }).click();
    cy.getByRole("option", { name: "Admin", native: false }).click();
    stubMembers([
      ...MEMBERS,
      makeOrgMember({ user_id: sol.id, username: "sol" }),
    ]);
    cy.getBySel("org-add-member-submit").should("have.text", "Add").click();

    cy.wait("@addMember")
      .its("request.body")
      .should("deep.equal", { role: "ADMIN" });
    cy.contains("[data-sonner-toast]", "Member added").should("be.visible");
    cy.getBySel("org-add-member-dialog").should("not.exist");
    cy.wait("@getMembers");
    cy.getBySel(`org-member-row-${sol.id}`)
      .findBySel("org-member-username")
      .should("have.text", "sol");
  });

  it("searches once, with what was typed, when the typing stops", () => {
    openAddMemberDialog();
    cy.wait("@searchUsers")
      .its("request.query")
      .should("deep.equal", { q: "" });
    cy.getByRole("textbox", { name: "Username" }).type("sol");

    cy.wait("@searchUsers")
      .its("request.query")
      .should("deep.equal", { q: "sol" });
    // Not one request per keystroke.
    cy.get("@searchUsers.all").should("have.length", 2);
  });

  it("adds as staff by default", () => {
    cy.stubApi("POST", "/organizations/{org_id}/members/{user_id}", {
      body: makeOrgMember({ user_id: sol.id, username: "sol" }),
      statusCode: 201,
    }).as("addMember");

    openAddMemberDialog().within(() => {
      cy.getBySel(`org-member-result-${sol.id}`).click();
      cy.getBySel("org-add-member-submit").click();
    });

    cy.wait("@addMember")
      .its("request.body")
      .should("deep.equal", { role: "STAFF" });
  });

  it("forgets the chosen account when the search changes", () => {
    openAddMemberDialog().within(() => {
      cy.getBySel(`org-member-result-${sol.id}`).click();
      cy.getBySel("org-add-member-submit").should("be.enabled");
      cy.getByRole("textbox", { name: "Username" }).type("x");
      cy.getBySel("org-add-member-submit").should("be.disabled");
      cy.getBySel("org-add-member-role").should("not.exist");
    });
  });

  it("says so when no account matches", () => {
    stubUserSearch([]);
    openAddMemberDialog().within(() => {
      cy.getByRole("textbox", { name: "Username" }).type("zzz");
      cy.getBySel("org-member-search-empty").should(
        "have.text",
        "No staff accounts.",
      );
      cy.getBySelLike("org-member-result-").should("not.exist");
    });
  });

  it("keeps the dialog open with the reason when the account is already a member", () => {
    cy.stubApiError("POST", "/organizations/{org_id}/members/{user_id}", {
      statusCode: 409,
      detail: "User is already a member of this organization",
    }).as("addMember");

    openAddMemberDialog().within(() => {
      cy.getBySel(`org-member-result-${sol.id}`).click();
      cy.getBySel("org-add-member-submit").click();
    });

    cy.wait("@addMember");
    cy.contains(
      "[data-sonner-toast]",
      "User is already a member of this organization",
    ).should("have.attr", "data-type", "error");
    cy.getBySel("org-add-member-dialog")
      .findBySel("org-add-member-submit")
      .should("be.enabled");
  });

  it("has no accessibility violations in the dialog", () => {
    openAddMemberDialog().within(() => {
      cy.getBySel(`org-member-result-${sol.id}`).click();
    });
    cy.getBySel("org-add-member-role").should("be.visible");
    cy.checkA11yAA();
  });
});
