import { stubAuditLog } from "../../support/routes/events";
import { stubDashboard } from "../../support/routes/dashboard";
import {
  makeEventGuest,
  makeEventLog,
  makeMeetup,
} from "../../../src/tests/factories";

const night = makeMeetup({ id: "meetup-1", name: "Alter Night" });

const checkIn = makeEventLog({
  id: 3,
  event_type: "CHECK_IN",
  guest: makeEventGuest({ id: "guest-9", displayname: "Cindy Dark" }),
  meetup_id: night.id,
});
const typeChange = makeEventLog({
  id: 2,
  event_type: "GUEST_TYPE_CHANGED",
  reason: "Changed guest_type from NORMAL to VENDOR",
  meetup_id: "0f5c2d1e-9a8b-4c7d-8e6f-123456789abc",
});
const finalized = makeEventLog({
  id: 1,
  event_type: "MEETUP_FINALIZED",
  actor: null,
  guest: null,
  meetup_id: null,
  reason: null,
});

describe("Audit log", () => {
  context("as an org admin", () => {
    beforeEach(() => {
      cy.loginAs("orgAdmin");
    });

    it("lists what happened, who did it, to whom and where", () => {
      stubAuditLog({
        events: [checkIn, typeChange, finalized],
        meetups: [night],
      });
      cy.visit("/events");
      cy.wait("@getEvents")
        .its("request.query")
        .should("deep.equal", { limit: "50", offset: "0" });

      cy.getByRole("heading", { name: "Audit Log" }).should("be.visible");
      cy.getBySelLike("event-row-").should("have.length", 3);

      cy.getBySel("event-row-3").within(() => {
        cy.getBySel("event-type").should("have.text", "Check-in");
        cy.getByRole("link", { name: "Cindy Dark" }).should(
          "have.attr",
          "href",
          "/guests/guest-9",
        );
        cy.getBySel("event-actor").should("have.text", "door");
        cy.getByRole("link", { name: "Alter Night" }).should(
          "have.attr",
          "href",
          "/meetups/meetup-1",
        );
        cy.getBySel("event-reason").should("have.text", "—");
      });

      // A guest type change reads in the UI language; a meetup the org list
      // does not know shows its short id.
      cy.getBySel("event-row-2").within(() => {
        cy.getBySel("event-type").should("have.text", "Guest type changed");
        cy.getBySel("event-reason").should("have.text", "Regular → Vendor");
        cy.getBySel("event-meetup").should("have.text", "0f5c2d1e…");
      });

      cy.getBySel("event-row-1").within(() => {
        cy.getBySel("event-type").should("have.text", "Finalized");
        cy.getBySel("event-guest").should("have.text", "—");
        cy.getBySel("event-actor").should("have.text", "—");
        cy.getBySel("event-meetup").should("have.text", "—");
      });
    });

    it("says so when nothing has happened yet", () => {
      stubAuditLog({ events: [] });
      cy.visit("/events");
      cy.wait("@getEvents");

      cy.getBySel("events-empty").should("have.text", "No events found.");
      cy.getBySel("events-load-more").should("not.exist");
    });

    it("shows placeholders while the log loads", () => {
      stubAuditLog({ delay: 1000 });
      cy.visit("/events");

      cy.getBySel("event-row-loading").should("have.length", 5);
      cy.getBySel("events-empty").should("not.exist");
      cy.wait("@getEvents");
      cy.getBySel("event-row-loading").should("not.exist");
      cy.getBySelLike("event-row-").should("have.length", 1);
    });

    it("shows an error with a retry when the log fails to load", () => {
      stubAuditLog();
      cy.stubApiError("GET", "/organizations/{org_id}/events/", {
        statusCode: 500,
      }).as("getEvents");
      cy.visit("/events");
      cy.wait("@getEvents");

      cy.getBySel("events-error").should(
        "contain.text",
        "Failed to load audit log.",
      );
      cy.getBySel("events-empty").should("not.exist");
      stubAuditLog({ events: [checkIn] });
      cy.getBySel("events-error").within(() => {
        cy.getByRole("button", { name: "Retry" }).click();
      });
      cy.wait("@getEvents");
      cy.getBySel("events-error").should("not.exist");
      cy.getBySel("event-row-3").should("be.visible");
    });

    it("has no accessibility violations", () => {
      stubAuditLog({
        events: [checkIn, typeChange, finalized],
        meetups: [night],
      });
      cy.visit("/events");
      cy.wait("@getEvents");
      cy.getBySelLike("event-row-").should("have.length", 3);
      cy.checkA11yAA();
    });
  });

  it("is open to site admins", () => {
    cy.loginAs("siteAdmin");
    stubAuditLog();
    cy.visit("/events");
    cy.wait("@getEvents");
    cy.getByRole("heading", { name: "Audit Log" }).should("be.visible");
  });

  it("is closed to door staff", () => {
    cy.loginAs("staff");
    stubDashboard();
    cy.visit("/events");

    cy.location("pathname").should("eq", "/dashboard");
    cy.getByRole("link", { name: "Audit Log" }).should("not.exist");
  });
});
