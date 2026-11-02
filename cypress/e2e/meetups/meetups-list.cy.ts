import { makeMeetup, type Role } from "../../../src/tests/factories";
import { stubMeetupList, stubMeetupPage } from "../../support/routes/meetups";

/** Tonight at 22:00 local time, `days` from today. */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(22, 0, 0, 0);
  return d.toISOString();
}

const TODAY = makeMeetup({
  id: "m-today",
  name: "Spookink II",
  date: daysFromNow(0),
  requires_payment: true,
});
const NEXT = makeMeetup({
  id: "m-next",
  name: "Alter #43",
  date: daysFromNow(20),
});
const OLD = makeMeetup({
  id: "m-old",
  name: "Alter #40",
  date: daysFromNow(-30),
  is_finalized: true,
  finalized_at: daysFromNow(-29),
});

describe("Meetups list", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  it("groups today and upcoming meetups apart from past ones", () => {
    stubMeetupList([NEXT, OLD, TODAY]);
    cy.visit("/meetups");
    cy.wait("@meetups");

    cy.getBySel("meetups-upcoming").within(() => {
      cy.getByRole("heading", { name: "Today and upcoming (2)" }).should(
        "be.visible",
      );
      cy.getBySelLike("meetup-row-").should("have.length", 2);
      cy.getBySelLike("meetup-row-")
        .eq(0)
        .should("have.attr", "data-cy", "meetup-row-m-today");
      cy.getBySelLike("meetup-row-")
        .eq(1)
        .should("have.attr", "data-cy", "meetup-row-m-next");
    });
    cy.getBySel("meetup-row-m-today").within(() => {
      cy.getBySel("meetup-badge-today").should("have.text", "Today");
      cy.getBySel("meetup-badge-paid").should("have.text", "Paid event");
    });
    cy.getBySel("meetup-row-m-next")
      .findBySel("meetup-when")
      .should("contain.text", "(in 20 days)");
    cy.getBySel("meetups-past").within(() => {
      cy.getByRole("heading", { name: "Past (1)" }).should("be.visible");
      cy.getBySel("meetup-row-m-old")
        .findBySel("meetup-badge-finalized")
        .should("have.text", "Finalized");
    });
    cy.getBySel("meetup-row-m-old")
      .findBySel("meetup-link")
      .should("have.attr", "href", "/meetups/m-old");
    cy.getBySel("meetup-row-m-old")
      .findBySel("meetup-mazmo-link")
      .should("have.attr", "href", OLD.mazmo_meetup_url)
      .and("have.attr", "target", "_blank");
  });

  it("sorts by name and date, and goes back to the groups on a third click", () => {
    stubMeetupList([NEXT, OLD, TODAY]);
    cy.visit("/meetups");
    cy.wait("@meetups");

    const order = (ids: string[]) =>
      cy
        .getBySel("meetups-sorted")
        .find("[data-cy^=meetup-row-]")
        .should(($rows) => {
          expect($rows.toArray().map((r) => r.dataset.cy)).to.deep.equal(
            ids.map((id) => `meetup-row-${id}`),
          );
        });

    cy.getBySel("meetups-sort-name").click();
    cy.getBySel("meetups-sort-name").should(
      "have.attr",
      "aria-pressed",
      "true",
    );
    cy.getBySel("meetups-upcoming").should("not.exist");
    order(["m-old", "m-next", "m-today"]);

    cy.getBySel("meetups-sort-name").click();
    order(["m-today", "m-next", "m-old"]);

    cy.getBySel("meetups-sort-name").click();
    cy.getBySel("meetups-sort-name").should(
      "have.attr",
      "aria-pressed",
      "false",
    );
    cy.getBySel("meetups-sorted").should("not.exist");
    cy.getBySel("meetups-upcoming").should("be.visible");

    cy.getBySel("meetups-sort-date").click();
    order(["m-old", "m-today", "m-next"]);
  });

  it("opens a meetup from the list", () => {
    stubMeetupList([TODAY]);
    stubMeetupPage({ meetup: TODAY });
    cy.visit("/meetups");
    cy.wait("@meetups");

    cy.getBySel("meetup-row-m-today").findBySel("meetup-link").click();

    cy.location("pathname").should("eq", "/meetups/m-today");
    cy.wait(["@meetup", "@guests"]);
    cy.getBySel("meetup-title")
      .should("have.text", "Spookink II")
      .and("match", "h1");
  });

  it("shows a loading list, then the empty state with a way to create one", () => {
    cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
      body: { total: 0, meetups: [] },
      delay: 400,
    }).as("meetups");
    cy.visit("/meetups");

    cy.getBySel("meetups-loading").should("be.visible");
    cy.wait("@meetups");
    cy.getBySel("meetups-loading").should("not.exist");
    cy.getBySel("meetups-empty")
      .should("contain.text", "No meetups yet. Create the first one.")
      .findBySel("meetups-empty-new")
      .click();
    cy.getByRole("dialog", { name: "New Meetup", native: false }).should(
      "be.visible",
    );
  });

  it("shows an error with a retry that loads the list again", () => {
    cy.stubApiError("GET", "/organizations/{org_id}/meetups/", {
      statusCode: 500,
    }).as("meetupsFailed");
    cy.visit("/meetups");

    cy.getBySel("meetups-error")
      .should("contain.text", "Failed to load meetups.")
      .and("be.visible");
    cy.getBySel("meetups-empty").should("not.exist");

    stubMeetupList([NEXT]);
    cy.getBySel("meetups-error").findBySel("retry").click();
    cy.wait("@meetups");
    cy.getBySel("meetups-error").should("not.exist");
    cy.getBySel("meetup-row-m-next").should("be.visible");
  });

  it("has no accessibility violations", () => {
    stubMeetupList([NEXT, OLD, TODAY]);
    cy.visit("/meetups");
    cy.wait("@meetups");
    cy.getBySel("meetup-row-m-today").should("be.visible");
    cy.checkA11yAA();
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("lists the meetups and opens one", () => {
      stubMeetupList([TODAY, OLD]);
      stubMeetupPage({ meetup: TODAY });
      cy.visit("/meetups");
      cy.wait("@meetups");

      cy.getBySel("meetup-row-m-today").findBySel("meetup-link").click();
      cy.location("pathname").should("eq", "/meetups/m-today");
      cy.getBySel("meetup-title").should("have.text", "Spookink II");
    });
  });
});

describe("Meetups list by role", () => {
  (["staff", "orgAdmin", "siteAdmin"] as Role[]).forEach((role) => {
    it(`lets ${role} see the list and create a meetup`, () => {
      cy.loginAs(role);
      stubMeetupList([TODAY]);
      cy.visit("/meetups");
      cy.wait("@meetups");
      cy.getBySel("meetup-row-m-today").should("be.visible");
      cy.getBySel("meetups-new").should("be.visible").and("be.enabled");
    });
  });
});
