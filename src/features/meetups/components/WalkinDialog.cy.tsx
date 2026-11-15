import { makeGuest, makeMeetupGuest } from "@/tests/factories";
import { WalkinDialog } from "./WalkinDialog";

const ON_LIST = makeGuest({ id: "g-ya", displayname: "Juan Perez Ya" });
const PEREZ = makeGuest({ id: "g-perez", displayname: "Juan Pérez" });
const BARMAN = makeGuest({ id: "g-barman", displayname: "ʙᴀʀᴍᴀɴ" });

function mount() {
  cy.mount(
    <WalkinDialog
      orgId="org-1"
      meetupId="meetup-1"
      alreadyRsvped={new Set(["g-ya"])}
      onClose={cy.spy().as("onClose")}
    />,
  );
}

function respond(guests = [ON_LIST, PEREZ, BARMAN]) {
  cy.stubApi("GET", "/guests/", { body: { total: guests.length, guests } }).as(
    "directory",
  );
}

describe("<WalkinDialog />", () => {
  it("searches the directory like the Guests page, leaving out the list", () => {
    respond();
    mount();
    cy.getBySel("walkin-candidate-g-barman").should("be.visible");
    cy.getBySel("walkin-candidate-g-ya").should("not.exist");
    cy.getBySel("walkin-search").should("be.focused").type("perez");
    cy.getBySel("walkin-candidate-g-barman").should("not.exist");
    cy.getBySelLike("walkin-candidate-").should("have.length", 1);
    cy.getBySel("walkin-candidate-g-perez").should("be.visible");
  });

  it("adds the picked guest to the meetup and closes", () => {
    respond();
    cy.stubApi(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/add-walkin",
      {
        body: makeMeetupGuest({ guest: PEREZ, rsvp: { is_walkin: true } }),
        statusCode: 201,
        params: { org_id: "org-1", meetup_id: "meetup-1", guest_id: "g-perez" },
      },
    ).as("add");
    mount();
    cy.getBySel("walkin-candidate-g-perez").findBySel("walkin-add").click();
    cy.wait("@add");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("says when everyone known is already on the list", () => {
    respond([ON_LIST]);
    mount();
    cy.getBySel("walkin-empty").should(
      "have.text",
      "All known guests are already on the RSVP list.",
    );
  });

  it("reports a failed directory without claiming it is empty", () => {
    cy.stubApiError("GET", "/guests/", { statusCode: 500 }).as("directory");
    mount();
    cy.getBySel("walkin-error").should(
      "have.text",
      "Failed to load guest list.",
    );
    cy.getBySel("walkin-empty").should("not.exist");
  });

  it("shows placeholders while the directory loads", () => {
    cy.stubApi("GET", "/guests/", {
      body: { total: 1, guests: [PEREZ] },
      delay: 800,
    }).as("directory");
    mount();
    cy.getBySel("walkin-loading").should("be.visible");
    cy.wait("@directory");
    cy.getBySel("walkin-loading").should("not.exist");
  });

  it("closes from Cancel and has no accessibility violations", () => {
    respond();
    mount();
    cy.getBySel("walkin-dialog").should("have.css", "opacity", "1");
    cy.checkA11yAA('[data-cy="walkin-dialog"]');
    cy.getBySel("dialog-cancel").click();
    cy.get("@onClose").should("have.been.calledOnce");
  });
});
