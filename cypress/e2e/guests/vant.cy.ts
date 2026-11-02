import { makeGuest } from "../../../src/tests/factories";
import {
  lastToast,
  stubBannedGuests,
  stubGuestProfile,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

const LUNA = makeGuest({ id: "guest-luna", displayname: "Luna" });
const REASON = "Harassed another guest";

function vantDialog() {
  return cy.getByRole("dialog", { name: "Vant Luna?", native: false });
}

function reasonField() {
  return cy.getByRole("textbox", { name: "Reason (required)" });
}

function confirmButton() {
  return cy.getByRole("button", { name: "Vant guest" });
}

describe("Vanting a guest", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  context("from the directory", () => {
    beforeEach(() => {
      stubGuestsPage({ guests: [LUNA] });
      cy.visit("/guests");
      cy.wait("@getBanned");
      cy.getBySel("guest-row-guest-luna").findBySel("guest-actions").click();
      cy.getBySel("guest-action-ban").click();
    });

    it("sends the trimmed reason, then marks the guest as vanted", () => {
      cy.stubApi("PATCH", "/organizations/{org_id}/guests/{guest_id}/ban", {
        body: vanted(LUNA, { banned_reason: REASON }),
        params: { org_id: "org-1", guest_id: "guest-luna" },
      }).as("ban");
      stubBannedGuests([vanted(LUNA, { banned_reason: REASON })]);

      reasonField().type(`  ${REASON}  `);
      confirmButton().click();

      cy.wait("@ban")
        .its("request.body")
        .should("deep.equal", { reason: REASON });
      vantDialog().should("not.exist");
      lastToast().should("have.text", "Luna has been vanted");
      cy.wait("@getBanned");
      cy.getBySel("guest-row-guest-luna")
        .findBySel("guest-badge-vanted")
        .should("have.text", "Vanted");
      cy.getBySel("guest-row-guest-luna").findBySel("guest-actions").click();
      cy.getBySel("guest-action-unban").should("be.visible");
      cy.getBySel("guest-action-ban").should("not.exist");
    });

    it("needs a reason of 5 to 500 characters, not counting spaces", () => {
      vantDialog().should("be.visible");
      confirmButton().should("be.disabled");
      reasonField().type("   abcd   ");
      vantDialog().should("contain.text", "4/500");
      confirmButton().should("be.disabled");
      reasonField().type("e");
      confirmButton().should("be.enabled");
      reasonField().clear();
      reasonField().type("x".repeat(501), { delay: 0 });
      vantDialog().should("contain.text", "501/500");
      confirmButton().should("be.disabled");
    });

    it("shows the backend's error and keeps the dialog open", () => {
      cy.stubApiError(
        "PATCH",
        "/organizations/{org_id}/guests/{guest_id}/ban",
        {
          statusCode: 409,
          detail: "Guest is already banned in this organization",
        },
      ).as("ban");

      reasonField().type(REASON);
      confirmButton().click();

      cy.wait("@ban");
      lastToast().should(
        "have.text",
        "Guest is already banned in this organization",
      );
      vantDialog().should("be.visible");
      confirmButton().should("be.enabled");
    });

    it("tells staff when the server can't be reached", () => {
      cy.stubApiError(
        "PATCH",
        "/organizations/{org_id}/guests/{guest_id}/ban",
        {
          statusCode: 0,
          forceNetworkError: true,
        },
      ).as("ban");

      reasonField().type(REASON);
      confirmButton().click();

      lastToast().should(
        "have.text",
        "No se pudo conectar con el servidor.\nVerificá tu conexión.",
      );
      vantDialog().should("be.visible");
    });

    it("closes on Cancel without vanting", () => {
      cy.stubApiError(
        "PATCH",
        "/organizations/{org_id}/guests/{guest_id}/ban",
        {
          statusCode: 500,
        },
      ).as("ban");

      reasonField().type(REASON);
      cy.getByRole("button", { name: "Cancel" }).click();

      vantDialog().should("not.exist");
      cy.get("@ban.all").should("have.length", 0);
    });

    it("has no accessibility violations", () => {
      vantDialog().should("be.visible");
      cy.checkA11yAA('[role="dialog"]');
    });
  });

  it("unvants from the directory and drops the badge", () => {
    stubGuestsPage({ guests: [LUNA], banned: [vanted(LUNA)] });
    cy.visit("/guests");
    cy.wait("@getBanned");
    cy.stubApi("PATCH", "/organizations/{org_id}/guests/{guest_id}/unban", {
      body: LUNA,
      params: { guest_id: "guest-luna" },
    }).as("unban");
    stubBannedGuests([]);

    cy.getBySel("guest-row-guest-luna").findBySel("guest-actions").click();
    cy.getBySel("guest-action-unban").click();

    cy.wait("@unban");
    lastToast().should("have.text", "Luna unvanted");
    cy.wait("@getBanned");
    cy.getBySel("guest-row-guest-luna")
      .findBySel("guest-badge-vanted")
      .should("not.exist");
  });

  it("shows the backend's error when unvanting fails", () => {
    stubGuestsPage({ guests: [LUNA], banned: [vanted(LUNA)] });
    cy.visit("/guests");
    cy.wait("@getBanned");
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/guests/{guest_id}/unban",
      {
        statusCode: 409,
        detail: "Guest is not banned in this organization",
      },
    ).as("unban");

    cy.getBySel("guest-row-guest-luna").findBySel("guest-actions").click();
    cy.getBySel("guest-action-unban").click();

    cy.wait("@unban");
    lastToast().should("have.text", "Guest is not banned in this organization");
    cy.getBySel("guest-row-guest-luna")
      .findBySel("guest-badge-vanted")
      .should("exist");
  });

  context("from the profile", () => {
    it("vants the guest and shows the vant with its reason", () => {
      stubGuestProfile(LUNA);
      cy.visit("/guests/guest-luna");
      cy.wait("@getBanned");
      cy.stubApi("PATCH", "/organizations/{org_id}/guests/{guest_id}/ban", {
        body: vanted(LUNA, { banned_reason: REASON }),
      }).as("ban");
      stubBannedGuests([vanted(LUNA, { banned_reason: REASON })]);

      cy.getBySel("guest-profile-ban").click();
      reasonField().type(REASON);
      confirmButton().click();

      cy.wait("@ban")
        .its("request.body")
        .should("deep.equal", { reason: REASON });
      cy.wait("@getBanned");
      cy.getBySel("guest-vant-alert")
        .findBySel("guest-vant-reason")
        .should("have.text", REASON);
      cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
      cy.getBySel("guest-profile-unban").should("be.visible");
      cy.getBySel("guest-profile-ban").should("not.exist");
    });

    it("unvants the guest and drops the vant", () => {
      stubGuestProfile(LUNA, { banned: [vanted(LUNA)] });
      cy.visit("/guests/guest-luna");
      cy.wait("@getBanned");
      cy.stubApi("PATCH", "/organizations/{org_id}/guests/{guest_id}/unban", {
        body: LUNA,
      }).as("unban");
      stubBannedGuests([]);

      cy.getBySel("guest-profile-unban").click();

      cy.wait("@unban");
      lastToast().should("have.text", "Luna unvanted");
      cy.getBySel("guest-vant-alert").should("not.exist");
      cy.getBySel("guest-profile-ban").should("be.visible");
    });

    it("offers neither Vant nor Unvant until the vant status loads", () => {
      stubGuestProfile(LUNA);
      cy.stubApi("GET", "/organizations/{org_id}/guests/banned", {
        body: { total: 0, guests: [] },
        delay: 1500,
      }).as("getBanned");
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-profile-edit").should("be.visible");
      cy.getBySel("guest-profile-ban").should("not.exist");
      cy.getBySel("guest-profile-unban").should("not.exist");
      cy.wait("@getBanned");
      cy.getBySel("guest-profile-ban").should("be.visible");
    });

    it("offers neither when the vant status fails, and recovers on retry", () => {
      stubGuestProfile(LUNA);
      cy.stubApiError("GET", "/organizations/{org_id}/guests/banned", {
        statusCode: 500,
      });
      cy.visit("/guests/guest-luna");

      cy.getBySel("guest-vant-status-message").should(
        "have.text",
        "Couldn't check whether this guest is vanted.",
      );
      cy.getBySel("guest-profile-ban").should("not.exist");
      cy.getBySel("guest-profile-unban").should("not.exist");
      stubBannedGuests([vanted(LUNA)]);
      cy.getBySel("guest-vant-status-error")
        .getByRole("button", { name: "Retry" })
        .click();

      cy.wait("@getBanned");
      cy.getBySel("guest-vant-status-error").should("not.exist");
      cy.getBySel("guest-profile-unban").should("be.visible");
    });
  });
});
