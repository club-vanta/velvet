import { makeGuest } from "@/tests/factories";
import { LinkMazmoDialog } from "./LinkMazmoDialog";

describe("<LinkMazmoDialog />", () => {
  beforeEach(() => {
    cy.mount(
      <LinkMazmoDialog
        guest={{ id: "g-1" }}
        onClose={cy.spy().as("onClose")}
      />,
      { as: "staff" },
    );
  });

  it("needs a handle, sends it trimmed and closes", () => {
    cy.stubApi("PATCH", "/guests/{guest_id}/link-mazmo", {
      body: makeGuest({ id: "g-1" }),
      params: { guest_id: "g-1" },
    }).as("link");
    cy.focused().should("have.attr", "data-cy", "link-mazmo-username");
    cy.getBySel("link-mazmo-dialog-confirm").should("be.disabled");
    cy.getByRole("textbox", { name: "Mazmo username" }).type(" luna ");
    cy.getBySel("link-mazmo-dialog-confirm").click();

    cy.wait("@link")
      .its("request.body")
      .should("deep.equal", { username: "luna" });
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("stays open, enabled again, when Mazmo has no such user", () => {
    cy.stubApiError("PATCH", "/guests/{guest_id}/link-mazmo", {
      statusCode: 404,
    }).as("link");
    cy.getBySel("link-mazmo-username").type("nobody");
    cy.getBySel("link-mazmo-dialog-confirm").click();

    cy.wait("@link");
    cy.getBySel("link-mazmo-dialog-confirm").should("have.text", "Link");
    cy.get("@onClose").should("not.have.been.called");
  });

  it("shows Linking… while it runs", () => {
    cy.stubApi("PATCH", "/guests/{guest_id}/link-mazmo", {
      body: makeGuest({ id: "g-1" }),
      delay: 800,
    }).as("link");
    cy.getBySel("link-mazmo-username").type("luna");
    cy.getBySel("link-mazmo-dialog-confirm").click();

    cy.getBySel("link-mazmo-dialog-confirm")
      .should("be.disabled")
      .and("have.text", "Linking…");
    cy.wait("@link");
  });

  it("has no accessibility violations", () => {
    cy.getByRole("dialog", { native: false }).should(
      "have.css",
      "opacity",
      "1",
    );
    cy.checkA11yAA('[role="dialog"]');
  });
});
