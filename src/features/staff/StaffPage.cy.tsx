import { StaffPage } from "./StaffPage";
import { makePendingUser, makeStaffUser } from "@/tests/factories";

// The page's states. The flows through the app live in cypress/e2e/staff/.
// Mounted signed out: signing in as a site admin would stub /staff/pending
// with an empty list after these stubs, and the page needs no user here.
describe("<StaffPage />", () => {
  it("shows an error in the pending tab instead of an empty list", () => {
    cy.stubApi("GET", "/staff/", { body: [makeStaffUser()] });
    cy.stubApiError("GET", "/staff/pending", { statusCode: 500 }).as(
      "getPending",
    );
    cy.mount(<StaffPage />);
    cy.wait("@getPending");

    cy.getBySel("staff-tab-pending").click();
    cy.getBySel("staff-pending-error").should(
      "contain.text",
      "Failed to load pending staff.",
    );
    cy.getBySel("staff-empty").should("not.exist");

    cy.stubApi("GET", "/staff/pending", { body: [makePendingUser()] }).as(
      "getPending",
    );
    cy.getBySel("staff-pending-error").within(() => {
      cy.getByRole("button", { name: "Retry" }).click();
    });
    cy.wait("@getPending");
    cy.getBySel("staff-pending-error").should("not.exist");
    cy.getBySel(`staff-row-${makePendingUser().id}`).should("be.visible");
  });
});
