import {
  ALL_STAFF,
  STAFF,
  stubStaffPage,
  stubStaffUpdate,
} from "../../support/routes/staff";

describe("Staff approval", () => {
  beforeEach(() => {
    cy.loginAs("siteAdmin");
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);
  });

  it("approves a pending account and refreshes both lists", () => {
    const approved = { ...STAFF.pending, is_approved: true };
    stubStaffUpdate("/staff/{user_id}/approve", approved).as("approve");

    cy.getBySel("staff-tab-pending").click();
    // The refetch after approving returns the account as active.
    stubStaffPage({
      all: ALL_STAFF.map((u) => (u.id === approved.id ? approved : u)),
    });
    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-approve")
      .click();

    cy.wait("@approve")
      .its("request.body")
      .should("deep.equal", { is_approved: true });
    cy.contains("[data-sonner-toast]", "Account approved").should(
      "have.attr",
      "data-type",
      "success",
    );
    cy.wait(["@getStaff", "@getPending"]);
    cy.getBySel("staff-empty").should("have.text", "No staff accounts.");
    cy.getBySel("staff-pending-count").should("not.exist");
    cy.getBySel("staff-tab-all").click();
    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-status")
      .should("have.text", "Active");
  });

  it("revokes the approval of an active account", () => {
    const revoked = { ...STAFF.active, is_approved: false };
    stubStaffUpdate("/staff/{user_id}/approve", revoked).as("revoke");
    stubStaffPage({
      all: ALL_STAFF.map((u) => (u.id === revoked.id ? revoked : u)),
    });

    cy.getBySel(`staff-row-${STAFF.active.id}`)
      .findBySel("staff-revoke")
      .click();

    cy.wait("@revoke")
      .its("request.body")
      .should("deep.equal", { is_approved: false });
    cy.contains("[data-sonner-toast]", "Approval revoked").should("be.visible");
    cy.wait("@getPending");
    cy.getBySel(`staff-row-${STAFF.active.id}`).within(() => {
      cy.getBySel("staff-status").should("have.text", "Pending");
      cy.getBySel("staff-approve").should("be.visible");
    });
    cy.getBySel("staff-pending-count").should("have.text", "2");
  });

  it("waits for the approval before allowing another one", () => {
    stubStaffUpdate(
      "/staff/{user_id}/approve",
      { ...STAFF.pending, is_approved: true },
      { delay: 1000 },
    ).as("approve");

    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-approve")
      .click();

    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-approve")
      .should("be.disabled");
    cy.getBySel(`staff-row-${STAFF.active.id}`)
      .findBySel("staff-revoke")
      .should("be.disabled");
    cy.wait("@approve");
    cy.getBySel(`staff-row-${STAFF.active.id}`)
      .findBySel("staff-revoke")
      .should("be.enabled");
  });

  it("shows the backend's reason when the approval is refused", () => {
    cy.stubApiError("PATCH", "/staff/{user_id}/approve", {
      statusCode: 400,
      detail: "Cannot approve a disabled account",
    }).as("approve");

    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-approve")
      .click();

    cy.wait("@approve");
    cy.contains(
      "[data-sonner-toast]",
      "Cannot approve a disabled account",
    ).should("have.attr", "data-type", "error");
    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-status")
      .should("have.text", "Pending");
  });

  it("shows an error and re-enables the button when the network fails", () => {
    cy.stubApiError("PATCH", "/staff/{user_id}/approve", {
      statusCode: 0,
      forceNetworkError: true,
    }).as("approve");

    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-approve")
      .click();

    cy.wait("@approve");
    cy.get("[data-sonner-toast][data-type=error]").should("have.length", 1);
    cy.getBySel(`staff-row-${STAFF.pending.id}`)
      .findBySel("staff-approve")
      .should("be.enabled");
  });
});
