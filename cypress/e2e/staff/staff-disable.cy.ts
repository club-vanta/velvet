import {
  ALL_STAFF,
  STAFF,
  stubStaffPage,
  stubStaffUpdate,
} from "../../support/routes/staff";
import { makeDisabledUser } from "../../../src/tests/factories";

const disabledLuz = makeDisabledUser({
  ...STAFF.active,
  is_disabled: true,
  disabled_reason: "Left the club",
});

function openDisableDialog() {
  cy.getBySel(`staff-row-${STAFF.active.id}`)
    .findBySel("staff-disable")
    .click();
  return cy.getByRole("dialog", { name: "Disable luz?", native: false });
}

describe("Disabling and enabling staff", () => {
  beforeEach(() => {
    cy.loginAs("siteAdmin");
    stubStaffPage();
    cy.visit("/staff");
    cy.wait(["@getStaff", "@getPending"]);
  });

  it("disables an account with a reason and shows it as disabled", () => {
    stubStaffUpdate("/staff/{user_id}/disable", disabledLuz).as("disable");

    openDisableDialog().within(() => {
      cy.getByRole("button", { name: "Disable account" }).should("be.disabled");
      cy.getByRole("textbox", { name: "Reason (required)" }).type(
        "  Left the club  ",
      );
      stubStaffPage({
        all: ALL_STAFF.map((u) => (u.id === disabledLuz.id ? disabledLuz : u)),
      });
      cy.getByRole("button", { name: "Disable account" }).click();
    });

    cy.wait("@disable")
      .its("request.body")
      .should("deep.equal", { reason: "Left the club" });
    cy.contains("[data-sonner-toast]", "luz disabled").should("be.visible");
    cy.getByRole("dialog", { native: false }).should("not.exist");
    cy.wait("@getStaff");
    cy.getBySel(`staff-row-${STAFF.active.id}`).within(() => {
      cy.getBySel("staff-status").should("have.text", "Disabled");
      cy.getBySel("staff-enable").should("be.visible");
      cy.getBySel("staff-disable").should("not.exist");
    });
  });

  it("needs a reason of at least five characters", () => {
    openDisableDialog().within(() => {
      cy.getByRole("textbox", { name: "Reason (required)" }).type("abcd");
      cy.getByRole("button", { name: "Disable account" }).should("be.disabled");
      cy.getByRole("textbox", { name: "Reason (required)" }).type("e");
      cy.getByRole("button", { name: "Disable account" }).should("be.enabled");
    });
  });

  it("keeps the dialog open with the backend's reason when it refuses", () => {
    cy.stubApiError("PATCH", "/staff/{user_id}/disable", {
      statusCode: 409,
      detail: "User is already disabled",
    }).as("disable");

    openDisableDialog().within(() => {
      cy.getByRole("textbox", { name: "Reason (required)" }).type(
        "Left the club",
      );
      cy.getByRole("button", { name: "Disable account" }).click();
    });

    cy.wait("@disable");
    cy.contains("[data-sonner-toast]", "User is already disabled").should(
      "have.attr",
      "data-type",
      "error",
    );
    cy.getByRole("dialog", { name: "Disable luz?", native: false }).within(
      () => {
        cy.getByRole("button", { name: "Disable account" }).should(
          "be.enabled",
        );
      },
    );
  });

  it("closes the dialog without a request on cancel", () => {
    openDisableDialog().within(() => {
      cy.getByRole("textbox", { name: "Reason (required)" }).type(
        "Left the club",
      );
      cy.getByRole("button", { name: "Cancel" }).click();
    });
    cy.getByRole("dialog", { native: false }).should("not.exist");
    cy.getBySel(`staff-row-${STAFF.active.id}`)
      .findBySel("staff-status")
      .should("have.text", "Active");
  });

  it("has no accessibility violations in the disable dialog", () => {
    openDisableDialog().should("be.visible");
    cy.checkA11yAA();
  });

  it("re-enables a disabled account", () => {
    const enabled = { ...STAFF.disabled, is_disabled: false };
    stubStaffUpdate("/staff/{user_id}/enable", enabled).as("enable");
    stubStaffPage({
      all: ALL_STAFF.map((u) => (u.id === enabled.id ? enabled : u)),
    });

    cy.getBySel(`staff-row-${STAFF.disabled.id}`)
      .findBySel("staff-enable")
      .click();

    cy.wait("@enable").its("request.body").should("be.oneOf", [null, ""]);
    cy.contains("[data-sonner-toast]", "Account re-enabled").should(
      "be.visible",
    );
    cy.wait("@getStaff");
    cy.getBySel(`staff-row-${STAFF.disabled.id}`).within(() => {
      cy.getBySel("staff-status").should("have.text", "Active");
      cy.getBySel("staff-disable").should("be.visible");
    });
  });

  it("shows the backend's reason when enabling fails", () => {
    cy.stubApiError("PATCH", "/staff/{user_id}/enable", {
      statusCode: 409,
      detail: "User is not disabled",
    }).as("enable");

    cy.getBySel(`staff-row-${STAFF.disabled.id}`)
      .findBySel("staff-enable")
      .click();

    cy.wait("@enable");
    cy.contains("[data-sonner-toast]", "User is not disabled").should(
      "have.attr",
      "data-type",
      "error",
    );
    cy.getBySel(`staff-row-${STAFF.disabled.id}`)
      .findBySel("staff-status")
      .should("have.text", "Disabled");
  });
});
