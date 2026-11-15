import { makeEvents, stubAuditLog } from "../../support/routes/events";
import { makeEventLog } from "../../../src/tests/factories";

function chooseType(name: string) {
  cy.getByRole("combobox", { name: "Type", native: false }).click();
  cy.getByRole("option", { name, native: false }).click();
}

describe("Filtering and paging the audit log", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("filters by event type and back to all events", () => {
    stubAuditLog({ events: makeEvents(3) });
    cy.visit("/events");
    cy.wait("@getEvents");
    cy.getBySel("events-type-filter-value").should("have.text", "All events");

    stubAuditLog({ events: [makeEventLog({ id: 9, event_type: "BAN" })] });
    chooseType("Vant");

    cy.wait("@getEvents")
      .its("request.query")
      .should("deep.equal", { limit: "50", offset: "0", type: "BAN" });
    cy.getBySel("events-type-filter-value").should("have.text", "Vant");
    cy.getBySelLike("event-row-")
      .should("have.length", 1)
      .findBySel("event-type")
      .should("have.text", "Vant");

    stubAuditLog({ events: makeEvents(3) });
    chooseType("All events");
    cy.getBySelLike("event-row-").should("have.length", 3);
  });

  it("offers every filterable type", () => {
    stubAuditLog();
    cy.visit("/events");
    cy.wait("@getEvents");

    cy.getByRole("combobox", { name: "Type", native: false }).click();
    cy.getByRole("option", { native: false }).then(($options) => {
      expect(Cypress._.map($options, "innerText")).to.deep.equal([
        "All events",
        "Check-in",
        "Un-check-in",
        "Vant",
        "Unvant",
        "Walk-in",
        "Payment recorded",
        "Payment revoked",
        "Guest type changed",
      ]);
    });
    cy.checkA11yAA();
  });

  it("hides Load more when the log fits in one page", () => {
    stubAuditLog({ events: makeEvents(49) });
    cy.visit("/events");
    cy.wait("@getEvents");

    cy.getBySelLike("event-row-").should("have.length", 49);
    cy.getBySel("events-load-more").should("not.exist");
  });

  it("loads the next page below the first one", () => {
    stubAuditLog({ events: makeEvents(50, 60), total: 60 });
    cy.visit("/events");
    cy.wait("@getEvents");
    cy.getBySelLike("event-row-").should("have.length", 50);

    stubAuditLog({ events: makeEvents(10, 10), total: 60 });
    cy.getBySel("events-load-more").should("have.text", "Load more").click();

    cy.wait("@getEvents")
      .its("request.query")
      .should("deep.equal", { limit: "50", offset: "50" });
    cy.getBySelLike("event-row-").should("have.length", 60);
    cy.getBySel("event-row-60").should("exist");
    cy.getBySel("event-row-1").should("exist");
    cy.getBySel("events-load-more").should("not.exist");
  });

  it("shows each event once when new ones shifted the next page", () => {
    stubAuditLog({ events: makeEvents(50, 60), total: 63 });
    cy.visit("/events");
    cy.wait("@getEvents");

    // Three check-ins were logged meanwhile: offset 50 starts at event 13,
    // which the first page already showed.
    stubAuditLog({ events: makeEvents(13, 13), total: 63 });
    cy.getBySel("events-load-more").click();
    cy.wait("@getEvents");

    cy.getBySelLike("event-row-").should("have.length", 60);
    cy.getBySel("event-row-11").should("have.length", 1);
    cy.getBySel("event-row-1").should("exist");
  });

  it("starts from the first page again when the filter changes", () => {
    stubAuditLog({ events: makeEvents(50, 60), total: 60 });
    cy.visit("/events");
    cy.wait("@getEvents");
    stubAuditLog({ events: makeEvents(10, 10), total: 60 });
    cy.getBySel("events-load-more").click();
    cy.wait("@getEvents");

    stubAuditLog({ events: [makeEventLog({ id: 99, event_type: "UNBAN" })] });
    chooseType("Unvant");

    cy.wait("@getEvents")
      .its("request.query")
      .should("deep.equal", { limit: "50", offset: "0", type: "UNBAN" });
    cy.getBySelLike("event-row-").should("have.length", 1);
  });
});
