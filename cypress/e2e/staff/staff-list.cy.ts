import { STAFF, stubStaffPage } from "../../support/routes/staff";

describe("Staff list", () => {
  beforeEach(() => {
    cy.loginAs("siteAdmin");
  });

  it("lists every account with its role, status and the actions it allows", () => {
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);

    cy.getByRole("heading", { name: "Staff Management" }).should("be.visible");
    cy.getBySelLike("staff-row-").should("have.length", 4);

    // The admin's own row: role shown, not editable, nothing to revoke.
    cy.getBySel(`staff-row-${STAFF.self.id}`).within(() => {
      cy.getBySel("staff-username").should("have.text", "root");
      cy.getBySel("staff-role").should("have.text", "SITE_ADMIN");
      cy.getBySel("staff-role-select").should("not.exist");
      cy.getBySel("staff-status").should("have.text", "Active");
      cy.getBySel("staff-recovery-code-open").should("be.visible");
      cy.getBySel("staff-revoke").should("not.exist");
      cy.getBySel("staff-disable").should("not.exist");
    });

    cy.getBySel(`staff-row-${STAFF.active.id}`).within(() => {
      cy.getByRole("combobox", { name: "Role of luz", native: false })
        .should("be.enabled")
        .findBySel("staff-role-value")
        .should("have.text", "USER");
      cy.getBySel("staff-status").should("have.text", "Active");
      cy.getBySel("staff-revoke").should("have.text", "Revoke");
      cy.getBySel("staff-disable").should("have.text", "Disable");
      cy.getBySel("staff-approve").should("not.exist");
      cy.getBySel("staff-enable").should("not.exist");
    });

    cy.getBySel(`staff-row-${STAFF.pending.id}`).within(() => {
      cy.getBySel("staff-status").should("have.text", "Pending");
      cy.getBySel("staff-approve").should("have.text", "Approve");
      cy.getBySel("staff-revoke").should("not.exist");
      cy.getBySel("staff-disable").should("not.exist");
    });

    cy.getBySel(`staff-row-${STAFF.disabled.id}`).within(() => {
      cy.getBySel("staff-status").should("have.text", "Disabled");
      cy.getBySel("staff-enable").should("have.text", "Enable");
      cy.getBySel("staff-disable").should("not.exist");
      cy.getBySel("staff-revoke").should("not.exist");
    });
  });

  it("shows the pending accounts in their own tab, with a count", () => {
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);

    cy.getBySel("staff-pending-count").should("have.text", "1");
    cy.getBySel("staff-tab-pending").click();
    cy.getBySel("staff-tab-pending").should(
      "have.attr",
      "aria-selected",
      "true",
    );
    cy.getBySelLike("staff-row-")
      .should("have.length", 1)
      .and("have.attr", "data-cy", `staff-row-${STAFF.pending.id}`);
  });

  it("hides the pending count when nobody is waiting", () => {
    stubStaffPage({ pending: [] });
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);

    cy.getBySel("staff-tab-pending").should("have.text", "Pending Approval");
    cy.getBySel("staff-pending-count").should("not.exist");
    cy.getBySel("staff-tab-pending").click();
    cy.getBySel("staff-empty").should("have.text", "No staff accounts.");
  });

  it("shows skeleton rows while the accounts load", () => {
    stubStaffPage({ delay: 1000 });
    cy.visit("/staff");

    cy.getBySel("staff-row-loading").should("have.length", 5);
    cy.getBySel("staff-empty").should("not.exist");
    cy.wait("@getStaff");
    cy.getBySel("staff-row-loading").should("not.exist");
    cy.getBySelLike("staff-row-").should("have.length", 4);
  });

  it("shows an error with a retry that reloads the list", () => {
    cy.stubApiError("GET", "/staff/", { statusCode: 500 }).as("getStaff");
    cy.stubApi("GET", "/staff/pending", { body: [] });
    cy.visit("/staff");
    cy.wait("@getStaff");

    cy.getBySel("staff-error").should("contain.text", "Failed to load staff.");
    stubStaffPage();
    cy.getBySel("staff-error").within(() => {
      cy.getByRole("button", { name: "Retry" }).click();
    });
    cy.wait("@getStaff");
    cy.getBySel("staff-error").should("not.exist");
    cy.getBySelLike("staff-row-").should("have.length", 4);
  });

  it("has no accessibility violations", () => {
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);
    cy.getBySelLike("staff-row-").should("have.length", 4);
    cy.checkA11yAA();
  });
});
