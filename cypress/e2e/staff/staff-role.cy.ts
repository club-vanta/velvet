import {
  ALL_STAFF,
  STAFF,
  stubStaffPage,
  stubStaffUpdate,
} from "../../support/routes/staff";

function chooseRole(role: "USER" | "SITE_ADMIN") {
  cy.getByRole("combobox", { name: "Role of luz", native: false }).click();
  cy.getByRole("option", { name: role, native: false }).click();
}

function roleOfLuz() {
  return cy
    .getBySel(`staff-row-${STAFF.active.id}`)
    .findBySel("staff-role-value");
}

describe("Changing a staff account's site role", () => {
  beforeEach(() => {
    cy.loginAs("siteAdmin");
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);
  });

  it("makes an account a site admin", () => {
    const promoted = {
      ...STAFF.active,
      role: { id: 2, name: "SITE_ADMIN" as const },
    };
    stubStaffUpdate("/staff/{user_id}/role", promoted).as("setRole");
    stubStaffPage({
      all: ALL_STAFF.map((u) => (u.id === promoted.id ? promoted : u)),
    });

    chooseRole("SITE_ADMIN");

    cy.wait("@setRole")
      .its("request.body")
      .should("deep.equal", { role: "SITE_ADMIN" });
    cy.contains("[data-sonner-toast]", "Role updated").should("be.visible");
    cy.wait("@getStaff");
    roleOfLuz().should("have.text", "SITE_ADMIN");
  });

  it("goes back to the saved role when the backend refuses the change", () => {
    cy.stubApiError("PATCH", "/staff/{user_id}/role", {
      statusCode: 400,
      detail: "Cannot change the role of the last site admin",
    }).as("setRole");

    chooseRole("SITE_ADMIN");

    cy.wait("@setRole");
    cy.contains(
      "[data-sonner-toast]",
      "Cannot change the role of the last site admin",
    ).should("have.attr", "data-type", "error");
    roleOfLuz().should("have.text", "USER");
  });

  it("has no accessibility violations with the role menu open", () => {
    cy.getByRole("combobox", { name: "Role of luz", native: false }).click();
    cy.getByRole("listbox", { native: false }).should("be.visible");
    cy.checkA11yAA();
  });
});
