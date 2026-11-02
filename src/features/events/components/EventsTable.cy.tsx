import { makeEventGuest, makeEventLog } from "@/tests/factories";
import { EventsTable } from "./EventsTable";

type Props = Parameters<typeof EventsTable>[0];

function mountTable(props: Partial<Props>) {
  cy.mount(
    <EventsTable
      events={[]}
      isLoading={false}
      isError={false}
      meetupNames={new Map()}
      {...props}
    />,
  );
}

describe("<EventsTable />", () => {
  it("links the guest and names the meetup", () => {
    mountTable({
      events: [
        makeEventLog({
          id: 7,
          guest: makeEventGuest({ id: "g-1", displayname: "Cindy Dark" }),
          meetup_id: "meetup-1",
        }),
      ],
      meetupNames: new Map([["meetup-1", "Alter Night"]]),
    });
    cy.getBySel("event-row-7").within(() => {
      cy.getByRole("link", { name: "Cindy Dark" }).should(
        "have.attr",
        "href",
        "/guests/g-1",
      );
      cy.getByRole("link", { name: "Alter Night" }).should(
        "have.attr",
        "href",
        "/meetups/meetup-1",
      );
    });
  });

  it("keeps a reason it cannot translate as written", () => {
    mountTable({
      events: [
        makeEventLog({
          id: 8,
          event_type: "GUEST_TYPE_CHANGED",
          reason: "Something else",
        }),
      ],
    });
    cy.getBySel("event-reason").should("have.text", "Something else");
  });

  it("shows an event type it does not know as written", () => {
    mountTable({ events: [makeEventLog({ event_type: "SOMETHING_NEW" })] });
    cy.getBySel("event-type").should("have.text", "SOMETHING_NEW");
  });

  it("shows placeholders while loading", () => {
    mountTable({ isLoading: true });
    cy.getBySel("event-row-loading").should("have.length", 5);
    cy.getBySel("events-empty").should("not.exist");
  });

  it("says so when the log is empty, but not when it failed", () => {
    mountTable({});
    cy.getBySel("events-empty").should("have.text", "No events found.");
    mountTable({ isError: true });
    cy.getBySel("events-empty").should("not.exist");
  });

  it("has no accessibility violations", () => {
    mountTable({ events: [makeEventLog()] });
    cy.checkA11yAA();
  });
});
