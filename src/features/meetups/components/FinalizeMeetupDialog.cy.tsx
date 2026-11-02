import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { makeMeetup, makeMeetupStats, type Schema } from "@/tests/factories";
import { FinalizeMeetupDialog } from "./FinalizeMeetupDialog";

const OPEN = makeMeetup({ name: "Alter Night" });
const CLOSED = makeMeetup({
  name: "Alter Night",
  is_finalized: true,
  finalized_at: "2026-10-02T03:00:00Z",
});

function mount(meetup: Schema<"MeetupPublic">) {
  cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
    body: makeMeetupStats({
      attendance: {
        total_rsvps: 10,
        arrived_count: 7,
        not_arrived_count: 3,
        walkin_count: 0,
      },
    }),
  }).as("stats");
  cy.mount(
    <>
      <Toaster />
      <FinalizeMeetupDialog
        orgId="org-1"
        meetup={meetup}
        onClose={cy.spy().as("onClose")}
      />
    </>,
  );
}

const toast = (type: "success" | "error") =>
  cy.get(`[data-sonner-toast][data-type="${type}"] [data-title]`);

describe("<FinalizeMeetupDialog />", () => {
  beforeEach(() => sonner.dismiss());

  it("says what finalizing locks, with the attendance", () => {
    mount(OPEN);
    cy.getByRole("dialog", {
      name: "Finalize Alter Night?",
      native: false,
    }).should("contain.text", "Once finalized, nobody can check guests in");
    cy.getBySel("finalize-summary").should(
      "have.text",
      "7 of 10 checked in. 3 never arrived.",
    );
    cy.getBySel("finalize-dialog").should("have.css", "opacity", "1");
    cy.checkA11yAA('[data-cy="finalize-dialog"]');
  });

  it("finalizes and closes", () => {
    mount(OPEN);
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/finalize",
      {
        body: CLOSED,
        params: { org_id: "org-1", meetup_id: "meetup-1" },
      },
    ).as("finalize");
    cy.getBySel("dialog-confirm")
      .should("have.text", "Finalize meetup")
      .click();
    cy.wait("@finalize");
    toast("success").should("have.text", "Alter Night finalized");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("reopens a finalized meetup, without the summary", () => {
    mount(CLOSED);
    cy.stubApi(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/unfinalize",
      { body: OPEN },
    ).as("reopen");
    cy.getByRole("dialog", {
      name: "Reopen Alter Night?",
      native: false,
    }).should(
      "contain.text",
      "Use this if the meetup was finalized by mistake.",
    );
    cy.getBySel("finalize-summary").should("not.exist");
    cy.getBySel("dialog-confirm").should("have.text", "Reopen meetup").click();
    cy.wait("@reopen");
    toast("success").should("have.text", "Alter Night reopened");
    cy.get("@onClose").should("have.been.calledOnce");
  });

  it("stays open with the reason when the backend refuses", () => {
    mount(OPEN);
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/finalize",
      { statusCode: 409, detail: "Meetup is already finalized" },
    ).as("finalize");
    cy.getBySel("dialog-confirm").click();
    cy.wait("@finalize");
    toast("error").should("have.text", "Meetup is already finalized");
    cy.get("@onClose").should("not.have.been.called");
  });
});
