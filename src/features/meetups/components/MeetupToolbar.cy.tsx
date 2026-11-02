import { makeMeetup, makeSyncResponse } from "@/tests/factories";
import { MeetupToolbar } from "./MeetupToolbar";

const OPEN = makeMeetup({ id: "m-1", requires_payment: false });
const CLOSED = makeMeetup({
  id: "m-1",
  is_finalized: true,
  finalized_at: "2026-10-02T05:00:00Z",
});

function mount(meetup = OPEN, isOrgAdmin = true) {
  cy.mount(
    <div className="@container">
      <MeetupToolbar
        orgId="org-1"
        meetup={meetup}
        isOrgAdmin={isOrgAdmin}
        onAddWalkin={cy.spy().as("onAddWalkin")}
        onTogglePayment={cy.spy().as("onTogglePayment")}
        onFinalize={cy.spy().as("onFinalize")}
      />
    </div>,
  );
}

describe("<MeetupToolbar />", () => {
  it("gives admins every tool of an open meetup", () => {
    mount();
    cy.getBySel("meetup-add-walkin").click();
    cy.get("@onAddWalkin").should("have.been.calledOnce");
    cy.getBySel("meetup-payment-toggle")
      .should("have.text", "Enable payment")
      .click();
    cy.get("@onTogglePayment").should("have.been.calledOnce");
    cy.getBySel("meetup-finalize")
      .should("have.text", "Finalize meetup")
      .click();
    cy.get("@onFinalize").should("have.been.calledOnce");
    cy.checkA11yAA('[data-cy="meetup-toolbar"]');
  });

  it("gives staff only the door tools", () => {
    mount(OPEN, false);
    cy.getBySel("meetup-sync").should("be.visible");
    cy.getBySel("meetup-add-walkin").should("be.visible");
    cy.getBySel("meetup-payment-toggle").should("not.exist");
    cy.getBySel("meetup-finalize").should("not.exist");
  });

  it("syncs the meetup and spins while it runs", () => {
    cy.stubApi("POST", "/organizations/{org_id}/meetups/{meetup_id}/sync", {
      body: makeSyncResponse(),
      params: { meetup_id: "m-1" },
      delay: 500,
    }).as("sync");
    mount();
    cy.getBySel("meetup-sync").click();
    cy.getBySel("meetup-sync").should("be.disabled");
    cy.wait("@sync");
    cy.getBySel("meetup-sync").should("be.enabled");
  });

  it("swaps the door tools for a note once finalized", () => {
    mount(CLOSED);
    cy.getBySel("meetup-finalized-note").should("be.visible");
    cy.getBySel("meetup-sync").should("not.exist");
    cy.getBySel("meetup-add-walkin").should("not.exist");
    cy.getBySel("meetup-payment-toggle").should("not.exist");
    cy.getBySel("meetup-finalize").should("have.text", "Reopen meetup");
  });
});
