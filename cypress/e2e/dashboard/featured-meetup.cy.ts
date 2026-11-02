import { meetupDate, stubDashboard } from "../../support/routes/dashboard";
import { makeMeetup, makeMeetupStats } from "../../../src/tests/factories";

const stats = makeMeetupStats({
  attendance: {
    total_rsvps: 40,
    arrived_count: 30,
    not_arrived_count: 10,
    walkin_count: 2,
  },
  cancellations: { cancelled_count: 3, cancelled_but_paid_count: 1 },
});

const lastWeek = makeMeetup({
  id: "m-past",
  name: "Last week",
  date: meetupDate(-7),
});
const tonight = makeMeetup({
  id: "m-today",
  name: "Tonight",
  date: meetupDate(0),
});
const nextWeek = makeMeetup({
  id: "m-next",
  name: "Next week",
  date: meetupDate(7),
});
const inTwoWeeks = makeMeetup({
  id: "m-later",
  name: "In two weeks",
  date: meetupDate(14),
});

describe("Featured meetup on the dashboard", () => {
  beforeEach(() => {
    cy.loginAs("staff");
  });

  it("features today's meetup with its live numbers", () => {
    stubDashboard({ meetups: [nextWeek, tonight, lastWeek], stats });
    cy.visit("/dashboard");
    cy.wait(["@getMeetups", "@getMeetupStats"])
      .its("1.request.url")
      .should("match", /\/meetups\/m-today\/stats$/);

    cy.getBySel("dashboard-featured").within(() => {
      cy.getBySel("dashboard-featured-label").should(
        "have.text",
        "Happening today",
      );
      cy.getByRole("heading", { name: "Tonight" }).should("be.visible");
      cy.getBySel("dashboard-open-meetup")
        .should("have.text", "Open meetup")
        .and("have.attr", "href", "/meetups/m-today");
      cy.getBySel("dashboard-stat-rsvps").should("have.text", "40");
      cy.getBySel("dashboard-stat-checkins").should("have.text", "30");
      cy.getBySel("dashboard-stat-arrived-percent").should(
        "have.text",
        "75% arrived",
      );
      cy.getBySel("dashboard-stat-not-arrived").should("have.text", "10");
      cy.getBySel("dashboard-stat-cancelled").should("have.text", "3");
    });
  });

  it("features the nearest upcoming meetup when there is none today", () => {
    stubDashboard({ meetups: [inTwoWeeks, nextWeek, lastWeek] });
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-featured").within(() => {
      cy.getBySel("dashboard-featured-label").should(
        "have.text",
        "Next meetup (in 7 days)",
      );
      cy.getByRole("heading", { name: "Next week" }).should("be.visible");
      cy.getBySel("dashboard-open-meetup").should(
        "have.attr",
        "href",
        "/meetups/m-next",
      );
    });
  });

  it("features the latest past meetup when nothing is coming up", () => {
    const longAgo = makeMeetup({
      id: "m-old",
      name: "Long ago",
      date: meetupDate(-30),
    });
    stubDashboard({ meetups: [lastWeek, longAgo] });
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-featured").within(() => {
      cy.getBySel("dashboard-featured-label").should(
        "have.text",
        "Last meetup (7 days ago)",
      );
      cy.getByRole("heading", { name: "Last week" }).should("be.visible");
    });
  });

  it("shows 0% arrived instead of dividing by zero without RSVPs", () => {
    stubDashboard({ meetups: [tonight], stats: makeMeetupStats() });
    cy.visit("/dashboard");
    cy.wait("@getMeetupStats");

    cy.getBySel("dashboard-stat-rsvps").should("have.text", "0");
    cy.getBySel("dashboard-stat-arrived-percent").should(
      "have.text",
      "0% arrived",
    );
  });

  it("shows placeholders while the numbers load", () => {
    stubDashboard({ meetups: [tonight] });
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
      body: stats,
      delay: 1000,
    }).as("getMeetupStats");
    cy.visit("/dashboard");

    cy.getBySel("dashboard-stats-loading").should("be.visible");
    cy.wait("@getMeetupStats");
    cy.getBySel("dashboard-stats-loading").should("not.exist");
    cy.getBySel("dashboard-stat-rsvps").should("have.text", "40");
  });

  it("offers a retry when the numbers fail to load", () => {
    stubDashboard({ meetups: [tonight] });
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/meetups/{meetup_id}/stats",
      {
        statusCode: 500,
      },
    ).as("getMeetupStats");
    cy.visit("/dashboard");
    cy.wait("@getMeetupStats");

    cy.getBySel("dashboard-stats-error").should(
      "contain.text",
      "Failed to load meetup stats.",
    );
    cy.getBySel("dashboard-featured")
      .getByRole("heading", { name: "Tonight" })
      .should("be.visible");
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/stats", {
      body: stats,
    }).as("getMeetupStats");
    cy.getBySel("dashboard-stats-error").within(() => {
      cy.getByRole("button", { name: "Retry" }).click();
    });
    cy.wait("@getMeetupStats");
    cy.getBySel("dashboard-stat-checkins").should("have.text", "30");
  });

  it("has no featured panel when the org has no meetups", () => {
    stubDashboard();
    cy.visit("/dashboard");
    cy.wait("@getMeetups");

    cy.getBySel("dashboard-meetups-empty").should("be.visible");
    cy.getBySel("dashboard-featured").should("not.exist");
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("puts tonight's meetup and its Open button first, full width", () => {
      stubDashboard({ meetups: [tonight], stats });
      cy.visit("/dashboard");
      cy.wait("@getMeetupStats");

      cy.getBySel("dashboard-open-meetup")
        .should("be.visible")
        .and(($link) => {
          const panel = $link.closest("[data-cy=dashboard-featured]")[0];
          const link = $link[0].getBoundingClientRect();
          const box = panel.getBoundingClientRect();
          // Full width inside the panel's 16px padding.
          expect(link.width).to.be.closeTo(box.width - 32, 2);
        });
      cy.getBySel("dashboard-stat-checkins").should("have.text", "30");
      cy.document().its("documentElement.scrollWidth").should("be.lte", 375);
      // The Shell's phone header is checked by the Shell's own specs.
      cy.checkA11yAA("main");
    });
  });

  it("has no accessibility violations", () => {
    // Today's meetup only: the recent list's relative dates ("7 days ago")
    // belong to MeetupRow, which the meetups specs check.
    stubDashboard({ meetups: [tonight], stats });
    cy.visit("/dashboard");
    cy.wait("@getMeetupStats");
    cy.getBySel("dashboard-stat-rsvps").should("have.text", "40");
    cy.checkA11yAA();
  });

  it("has no accessibility violations on a past meetup's panel", () => {
    stubDashboard({ meetups: [lastWeek], stats });
    cy.visit("/dashboard");
    cy.wait("@getMeetupStats");
    cy.getBySel("dashboard-featured-label").should(
      "have.text",
      "Last meetup (7 days ago)",
    );
    cy.checkA11yAA("[data-cy=dashboard-featured]");
  });
});
