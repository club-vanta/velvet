import { makeGuest } from "@/tests/factories";
import type { VantStatus } from "../lib/vantStatus";
import { GuestProfileActions } from "./GuestProfileActions";

const LINKED = makeGuest({ id: "g-1", displayname: "Luna" });
const MANUAL = makeGuest({ id: "g-2", mazmo_handle: null });

function mount(
  guest = LINKED,
  {
    status = "clear" as VantStatus,
    isOrgAdmin = false,
    unbanPending = false,
  } = {},
) {
  cy.mount(
    <div className="flex flex-wrap gap-2">
      <GuestProfileActions
        guest={guest}
        status={status}
        isOrgAdmin={isOrgAdmin}
        unbanPending={unbanPending}
        onAction={cy.spy().as("onAction")}
      />
    </div>,
  );
}

describe("<GuestProfileActions />", () => {
  it("edits and unlinks a linked guest known not to be vanted", () => {
    mount();
    cy.getByRole("button", { name: "Edit" }).click();
    cy.get("@onAction").should("have.been.calledWith", "edit", LINKED);
    cy.getByRole("button", { name: "Unlink Mazmo account" }).click();
    cy.get("@onAction").should("have.been.calledWith", "unlink", LINKED);
    cy.getBySel("guest-profile-link").should("not.exist");
    cy.getBySel("guest-profile-unlink-hint").should("not.exist");
  });

  it("links a guest without Mazmo", () => {
    mount(MANUAL);
    cy.getByRole("button", { name: "Link Mazmo account" }).click();
    cy.get("@onAction").should("have.been.calledOnceWith", "link", MANUAL);
    cy.getBySel("guest-profile-unlink").should("not.exist");
  });

  const blocked: [VantStatus, string][] = [
    ["vanted", "A vanted guest can't be unlinked from Mazmo."],
    ["unknown", "Can't unlink until the vant status has loaded."],
  ];
  blocked.forEach(([status, reason]) => {
    it(`disables Unlink while ${status}, with a visible described reason`, () => {
      mount(LINKED, { status });
      cy.getBySel("guest-profile-unlink-hint").should("have.text", reason);
      cy.getBySel("guest-profile-unlink")
        .should("be.disabled")
        .invoke("attr", "aria-describedby")
        .then((id) => {
          cy.getBySel("guest-profile-unlink-hint").should(
            "have.attr",
            "id",
            id,
          );
        });
    });
  });

  it("never offers vanting to staff", () => {
    mount(LINKED, { status: "vanted" });
    cy.getBySel("guest-profile-ban").should("not.exist");
    cy.getBySel("guest-profile-unban").should("not.exist");
  });

  it("offers an admin Vant for a guest known not to be vanted", () => {
    mount(LINKED, { isOrgAdmin: true });
    cy.getByRole("button", { name: "Vant" }).click();
    cy.get("@onAction").should("have.been.calledOnceWith", "ban", LINKED);
  });

  it("offers an admin Unvant for a vanted guest, disabled while it runs", () => {
    mount(LINKED, { isOrgAdmin: true, status: "vanted", unbanPending: true });
    cy.getByRole("button", { name: "Unvant" }).should("be.disabled");
    cy.getBySel("guest-profile-ban").should("not.exist");
  });

  it("offers an admin neither while the vant status is unknown", () => {
    mount(LINKED, { isOrgAdmin: true, status: "unknown" });
    cy.getBySel("guest-profile-ban").should("not.exist");
    cy.getBySel("guest-profile-unban").should("not.exist");
  });

  it("unvants on click", () => {
    mount(LINKED, { isOrgAdmin: true, status: "vanted" });
    cy.getByRole("button", { name: "Unvant" }).click();
    cy.get("@onAction").should("have.been.calledOnceWith", "unban", LINKED);
  });

  it("has no accessibility violations", () => {
    mount(LINKED, { isOrgAdmin: true, status: "vanted" });
    cy.checkA11yAA();
  });
});
