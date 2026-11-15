import { makeGuest } from "@/tests/factories";
import type { VantStatus } from "../lib/vantStatus";
import { DirectoryRow } from "./DirectoryRow";

const LUNA = makeGuest({
  id: "g-1",
  displayname: "Luna",
  mazmo_user_id: 1001,
  instagram_username: "luna.ig",
});

function mount(guest = LUNA, status: VantStatus = "clear") {
  cy.mount(
    <ul className="@container">
      <DirectoryRow
        guest={guest}
        status={status}
        isOrgAdmin
        unbanPending={false}
        onAction={cy.spy().as("onAction")}
      />
    </ul>,
  );
}

describe("<DirectoryRow />", () => {
  it("shows the Mazmo ID and links the Instagram handle", () => {
    mount();
    cy.getBySel("guest-row-g-1").within(() => {
      cy.getBySel("guest-mazmo-id").should("have.text", "1001");
      cy.getByRole("link", { name: "@luna.ig" })
        .should("have.attr", "href", "https://instagram.com/luna.ig")
        .and("have.attr", "target", "_blank");
      cy.getBySel("guest-badge-vanted").should("not.exist");
    });
  });

  it("shows dashes for a guest without Mazmo ID or Instagram", () => {
    mount(
      makeGuest({ id: "g-1", mazmo_user_id: null, instagram_username: null }),
    );
    cy.getBySel("guest-mazmo-id").should("have.text", "—");
    cy.getBySel("guest-instagram").should("have.text", "—");
  });

  it("marks a vanted guest and passes the row's actions up", () => {
    mount(LUNA, "vanted");
    cy.getBySel("guest-badge-vanted").should("have.text", "Vanted");
    cy.getBySel("guest-actions").click();
    cy.getBySel("guest-action-unban").click();
    cy.get("@onAction").should("have.been.calledOnceWith", "unban", LUNA);
  });

  it("has no accessibility violations", () => {
    mount();
    cy.checkA11yAA();
  });
});
