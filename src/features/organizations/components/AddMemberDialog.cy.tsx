import { ORG_ID, makeOrgMember, makeUserSearchResult } from "@/tests/factories";
import { AddMemberDialog } from "./AddMemberDialog";

const sol = makeUserSearchResult({ id: 20, username: "sol" });

describe("<AddMemberDialog />", () => {
  function mountDialog() {
    cy.mount(
      <AddMemberDialog orgId={ORG_ID} onClose={cy.spy().as("onClose")} />,
    );
  }

  it("shows placeholders while searching", () => {
    cy.stubApi("GET", "/users/", { body: [sol], delay: 500 }).as("searchUsers");
    mountDialog();
    cy.getBySel("org-member-search-loading").should("be.visible");
    cy.wait("@searchUsers");
    cy.getBySel("org-member-search-loading").should("not.exist");
    cy.getBySel("org-member-result-20").should("be.visible");
  });

  it("adds the chosen account with the chosen role, then closes", () => {
    cy.stubApi("GET", "/users/", { body: [sol] });
    cy.stubApi("POST", "/organizations/{org_id}/members/{user_id}", {
      body: makeOrgMember({ user_id: 20, username: "sol", role: "ADMIN" }),
      statusCode: 201,
      params: { org_id: ORG_ID, user_id: "20" },
      delay: 200,
    }).as("addMember");
    mountDialog();

    cy.getBySel("org-member-result-20").click();
    cy.getByRole("combobox", { name: "Role", native: false }).click();
    cy.getByRole("option", { name: "Admin", native: false }).click();
    cy.getBySel("org-add-member-submit").click();
    cy.getBySel("org-add-member-submit")
      .should("have.text", "Adding…")
      .and("be.disabled");

    cy.wait("@addMember")
      .its("request.body")
      .should("deep.equal", { role: "ADMIN" });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("selects a result with the keyboard", () => {
    cy.stubApi("GET", "/users/", { body: [sol] });
    mountDialog();
    cy.getBySel("org-member-result-20").should("be.visible");
    cy.getByRole("textbox", { name: "Username" }).should("be.focused");
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should("have.attr", "data-cy", "org-member-result-20");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    cy.getBySel("org-member-result-20").should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    cy.getBySel("org-add-member-submit").should("be.enabled");
  });

  it("has no accessibility violations", () => {
    cy.stubApi("GET", "/users/", { body: [sol] });
    mountDialog();
    cy.getBySel("org-member-result-20").should("be.visible");
    cy.checkA11yAA();
  });
});
