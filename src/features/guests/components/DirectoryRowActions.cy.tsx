import { makeGuest } from "@/tests/factories";
import type { VantStatus } from "../lib/vantStatus";
import { DirectoryRowActions } from "./DirectoryRowActions";

const LINKED = makeGuest({ id: "g-1", displayname: "Luna" });
const MANUAL = makeGuest({ id: "g-2", displayname: "Sol", mazmo_handle: null });

function mount(
  guest = LINKED,
  {
    status = "clear" as VantStatus,
    isOrgAdmin = false,
    unbanPending = false,
  } = {},
) {
  cy.mount(
    <DirectoryRowActions
      guest={guest}
      status={status}
      isOrgAdmin={isOrgAdmin}
      unbanPending={unbanPending}
      onAction={cy.spy().as("onAction")}
    />,
  );
  cy.getByRole("button", {
    name: `Guest actions: ${guest.displayname}`,
  }).click();
}

describe("<DirectoryRowActions />", () => {
  it("links to the profile and edits the guest", () => {
    mount();
    cy.getBySel("guest-action-view").should("have.attr", "href", "/guests/g-1");
    cy.getBySel("guest-action-edit").click();
    cy.get("@onAction").should("have.been.calledOnceWith", "edit", LINKED);
  });

  it("offers Unlink for a linked guest and Link for one without Mazmo", () => {
    mount();
    cy.getBySel("guest-action-link").should("not.exist");
    cy.getBySel("guest-action-unlink").click();
    cy.get("@onAction").should("have.been.calledOnceWith", "unlink", LINKED);
  });

  it("offers Link for a guest without Mazmo", () => {
    mount(MANUAL);
    cy.getBySel("guest-action-unlink").should("not.exist");
    cy.getBySel("guest-action-link").click();
    cy.get("@onAction").should("have.been.calledOnceWith", "link", MANUAL);
  });

  it("never offers vanting to staff", () => {
    mount(LINKED, { status: "vanted" });
    cy.getBySel("guest-action-ban").should("not.exist");
    cy.getBySel("guest-action-unban").should("not.exist");
  });

  it("offers an admin Vant for a guest known not to be vanted", () => {
    mount(LINKED, { isOrgAdmin: true });
    cy.getBySel("guest-action-ban").should("have.text", "Vant").click();
    cy.get("@onAction").should("have.been.calledOnceWith", "ban", LINKED);
  });

  it("offers an admin Unvant for a vanted guest, disabled while it runs", () => {
    mount(LINKED, { isOrgAdmin: true, status: "vanted", unbanPending: true });
    cy.getBySel("guest-action-ban").should("not.exist");
    cy.getBySel("guest-action-unban").should(
      "have.attr",
      "aria-disabled",
      "true",
    );
  });

  it("offers an admin neither while the vant status is unknown", () => {
    mount(LINKED, { isOrgAdmin: true, status: "unknown" });
    cy.getBySel("guest-action-ban").should("not.exist");
    cy.getBySel("guest-action-unban").should("not.exist");
  });

  const blocked: [VantStatus, string][] = [
    ["vanted", "A vanted guest can't be unlinked from Mazmo."],
    ["unknown", "Can't unlink until the vant status has loaded."],
  ];
  blocked.forEach(([status, reason]) => {
    it(`disables Unlink while ${status} and describes why`, () => {
      mount(LINKED, { status });
      cy.getByRole("menuitem", { name: "Unlink Mazmo account" })
        .should("have.attr", "aria-disabled", "true")
        .and("have.attr", "aria-describedby", "unlink-hint-g-1");
      cy.getBySel("guest-action-unlink-hint").should("have.text", reason);
      // Disabled items take no pointer events, so a user can't pick it.
      cy.getBySel("guest-action-unlink").should(
        "have.css",
        "pointer-events",
        "none",
      );
    });
  });

  it("moves through the items with the keyboard, disabled ones included", () => {
    mount(LINKED, { status: "vanted" });
    cy.getByRole("menu").should("be.visible");
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.focused().should("have.attr", "data-cy", "guest-action-unlink");
  });

  it("has no accessibility violations with the menu open", () => {
    mount(LINKED, { isOrgAdmin: true, status: "vanted" });
    cy.getByRole("menu").should("have.css", "opacity", "1");
    cy.checkA11yAA();
  });
});
