import {
  makeArrivalStats,
  makeAttendanceStats,
  makeDemographicStats,
  makeDemographicSummary,
  makeEmptyArrivalSummary,
  makeEmptyRetentionSummary,
  makeLeadTimeRows,
  makeNoShowStats,
  makeNoShowSummary,
  makeOperationsStats,
  makeOperationsSummary,
  makeRetentionStats,
  makeWeatherStats,
} from "../../../src/tests/factories";
import {
  LAST_3_MONTHS,
  requestQuery,
  stubAllStats,
  stubArrivals,
  stubAttendance,
  stubDemographics,
  stubNoShows,
  stubOperations,
  stubRetention,
  stubWeather,
  visitStats,
  waitForAnimations,
} from "../../support/routes/stats";

type StubExtras = { delay?: number };

/**
 * Every tab: its URL value and label, how to stub its endpoint (with data or
 * with an empty period), and one element that shows its data loaded.
 */
const TABS = [
  {
    value: "attendance",
    label: "Attendance",
    stub: (extras?: StubExtras) =>
      stubAttendance(makeAttendanceStats(), extras),
    stubEmpty: () => stubAttendance(makeAttendanceStats({ meetups: [] })),
    path: "/organizations/{org_id}/stats/attendance",
    alias: "@getAttendance",
    loaded: {
      sel: "stats-headline-attended",
      part: "stats-headline-value",
      text: "412",
    },
  },
  {
    value: "no-shows",
    label: "No-shows",
    stub: (extras?: StubExtras) => stubNoShows(makeNoShowStats(), extras),
    stubEmpty: () =>
      stubNoShows(
        makeNoShowStats({
          summary: makeNoShowSummary({ expected: 0, no_show: 0 }),
        }),
      ),
    path: "/organizations/{org_id}/stats/no-shows",
    alias: "@getNoShows",
    loaded: {
      sel: "stats-headline-no-show-rate",
      part: "stats-headline-value",
      text: "15%",
    },
  },
  {
    value: "arrivals",
    label: "Timing",
    stub: (extras?: StubExtras) => stubArrivals(makeArrivalStats(), extras),
    stubEmpty: () =>
      stubArrivals(
        makeArrivalStats({
          summary: makeEmptyArrivalSummary(),
          lead_time: makeLeadTimeRows().map((r) => ({ ...r, signed_up: 0 })),
        }),
      ),
    path: "/organizations/{org_id}/stats/arrivals",
    alias: "@getArrivals",
    loaded: {
      sel: "stats-headline-mean-arrival",
      part: "stats-headline-value",
      text: "22:45",
    },
  },
  {
    value: "demographics",
    label: "Demographics",
    stub: (extras?: StubExtras) =>
      stubDemographics(makeDemographicStats(), extras),
    stubEmpty: () =>
      stubDemographics(
        makeDemographicStats({
          summary: makeDemographicSummary({ attended: 0 }),
        }),
      ),
    path: "/organizations/{org_id}/stats/demographics",
    alias: "@getDemographics",
    loaded: {
      sel: "stats-headline-median-age",
      part: "stats-headline-value",
      text: "32.7",
    },
  },
  {
    value: "retention",
    label: "Loyalty",
    stub: (extras?: StubExtras) => stubRetention(makeRetentionStats(), extras),
    stubEmpty: () =>
      stubRetention(
        makeRetentionStats({ summary: makeEmptyRetentionSummary() }),
      ),
    path: "/organizations/{org_id}/stats/retention",
    alias: "@getRetention",
    loaded: {
      sel: "stats-headline-came-back",
      part: "stats-headline-value",
      text: "35%",
    },
  },
  {
    value: "operations",
    label: "Operations",
    stub: (extras?: StubExtras) =>
      stubOperations(makeOperationsStats(), extras),
    stubEmpty: () =>
      stubOperations(
        makeOperationsStats({
          summary: makeOperationsSummary({ attended: 0 }),
        }),
      ),
    path: "/organizations/{org_id}/stats/operations",
    alias: "@getOperations",
    loaded: {
      sel: "stats-headline-came-in",
      part: "stats-headline-value",
      text: "300",
    },
  },
  {
    value: "weather",
    label: "Weather",
    stub: (extras?: StubExtras) => stubWeather(makeWeatherStats(), extras),
    stubEmpty: () => stubWeather(makeWeatherStats({ meetups: [] })),
    path: "/organizations/{org_id}/stats/weather",
    alias: "@getWeather",
    loaded: {
      sel: "stats-band-FROM_15_TO_20",
      part: "stats-band-avg",
      text: "96",
    },
  },
] as const;

const selected = (value: string) =>
  cy
    .getBySel(`stats-tab-${value}`)
    .should("have.attr", "aria-selected", "true");

describe("Stats tabs", () => {
  it("opens on Attendance and lists every tab in order", () => {
    stubAttendance();
    visitStats();
    cy.getByRole("tab").should(($tabs) => {
      expect($tabs.toArray().map((t) => t.textContent)).to.deep.equal(
        TABS.map((t) => t.label),
      );
    });
    selected("attendance");
  });

  it("writes the picked tab to the URL, and Back returns to the previous one", () => {
    stubAllStats();
    visitStats();
    cy.getByRole("tab", { name: "Timing" }).click();
    cy.location("search").should("eq", "?tab=arrivals");
    selected("arrivals");
    cy.getByRole("tab", { name: "Weather" }).click();
    cy.location("search").should("eq", "?tab=weather");
    cy.go("back");
    cy.location("search").should("eq", "?tab=arrivals");
    selected("arrivals");
    cy.go("back");
    cy.location("search").should("eq", "");
    selected("attendance");
    cy.go("forward");
    selected("arrivals");
  });

  it("falls back to Attendance for an unknown tab", () => {
    stubAttendance();
    visitStats("/stats?tab=bogus");
    selected("attendance");
    cy.wait("@getAttendance");
  });

  it("switches tabs with the arrow keys", () => {
    stubAllStats();
    visitStats();
    cy.getBySel("stats-tab-attendance").focus();
    cy.press(Cypress.Keyboard.Keys.RIGHT);
    cy.focused().should("have.attr", "data-cy", "stats-tab-no-shows");
    cy.press(Cypress.Keyboard.Keys.SPACE);
    selected("no-shows");
    cy.location("search").should("eq", "?tab=no-shows");
  });

  TABS.forEach((tab) => {
    describe(`the ${tab.label} tab`, () => {
      it("asks only for its own numbers, with the period", () => {
        tab.stub();
        visitStats(`/stats?tab=${tab.value}`);
        selected(tab.value);
        requestQuery(tab.alias).should("deep.equal", LAST_3_MONTHS);
        cy.getBySel(tab.loaded.sel)
          .findBySel(tab.loaded.part)
          .should("have.text", tab.loaded.text);
        // The other tabs' endpoints are not stubbed: a request would fail.
      });

      it("shows a skeleton while its numbers load", () => {
        tab.stub({ delay: 1500 });
        visitStats(`/stats?tab=${tab.value}`);
        cy.getBySel(`stats-${tab.value}-skeleton`).should("be.visible");
        cy.wait(tab.alias);
        cy.getBySel(`stats-${tab.value}-skeleton`).should("not.exist");
        cy.getBySel(tab.loaded.sel).should("be.visible");
      });

      it("says the period has no finalized events", () => {
        tab.stubEmpty();
        visitStats(`/stats?tab=${tab.value}`);
        cy.getBySel("stats-empty").should(
          "have.text",
          "No finalized events in this period",
        );
      });

      it("shows the error and loads on retry", () => {
        cy.stubApiError("GET", tab.path, { statusCode: 500 }).as("failed");
        visitStats(`/stats?tab=${tab.value}`);
        cy.wait("@failed");
        cy.getBySel("stats-error").should(
          "contain.text",
          "Could not load the statistics.",
        );
        cy.getBySel("stats-show-all").should("not.exist");
        tab.stub();
        cy.getBySel("stats-retry").click();
        cy.wait(tab.alias);
        cy.getBySel("stats-error").should("not.exist");
        cy.getBySel(tab.loaded.sel).should("be.visible");
      });
    });
  });

  describe("errors", () => {
    it("shows the same message for a rejected event, with a way back to all events", () => {
      cy.stubApiError("GET", "/organizations/{org_id}/stats/attendance", {
        statusCode: 404,
        detail: "Meetup not found",
      }).as("failed");
      visitStats("/stats?meetup=m-march");
      cy.wait("@failed");
      cy.getBySel("stats-error").should(
        "contain.text",
        "Could not load the statistics.",
      );
      stubAttendance();
      cy.getByRole("button", { name: "See all events" }).click();
      cy.location("search").should("eq", "");
      requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
      cy.getBySel("stats-headline-attended").should("be.visible");
    });

    it("shows the error when the network fails", () => {
      cy.stubApiError("GET", "/organizations/{org_id}/stats/attendance", {
        statusCode: 0,
        forceNetworkError: true,
      }).as("failed");
      visitStats();
      cy.wait("@failed");
      cy.getBySel("stats-error").should("be.visible");
      cy.getBySel("stats-retry").should("be.visible");
    });

    it("has no accessibility violations", () => {
      cy.stubApiError("GET", "/organizations/{org_id}/stats/attendance", {
        statusCode: 500,
      });
      visitStats("/stats?meetup=m-march");
      cy.getBySel("stats-show-all").should("be.visible");
      waitForAnimations();
      cy.checkA11yAA();
    });
  });

  context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
    it("scrolls the tab strip to keep the selected tab in view", () => {
      stubAllStats();
      visitStats("/stats?tab=weather");
      cy.getByRole("tablist").should(($list) => {
        const list = $list[0]!;
        expect(list.scrollWidth).to.be.greaterThan(list.clientWidth);
        expect(list.scrollLeft).to.be.greaterThan(0);
      });
      // The strip scrolls without showing a scrollbar.
      cy.getByRole("tablist").should("have.css", "scrollbar-width", "none");
      cy.getBySel("stats-tab-weather").should(($tab) => {
        const tab = $tab[0]!.getBoundingClientRect();
        const list = $tab[0]!.parentElement!.getBoundingClientRect();
        expect(tab.left).to.be.at.least(list.left - 1);
        expect(tab.right).to.be.at.most(list.right + 1);
      });
      cy.getBySel("stats-tab-attendance").click();
      cy.getBySel("stats-tab-attendance").should(($tab) => {
        const tab = $tab[0]!.getBoundingClientRect();
        const list = $tab[0]!.parentElement!.getBoundingClientRect();
        expect(tab.left).to.be.at.least(list.left - 1);
      });
    });

    it("fits the filters and the cards in the screen", () => {
      stubAttendance();
      visitStats("/stats?range=custom&from=2026-03-01&to=2026-03-31");
      cy.getBySel("stats-headline-attended").should("be.visible");
      cy.document().should((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(375);
      });
      cy.getBySel("stats-period").should(($el) => {
        expect($el[0]!.getBoundingClientRect().right).to.be.at.most(375);
      });
      cy.getBySel("stats-range-to").should("be.visible");
      waitForAnimations();
      // The page itself: the Shell's phone header is not part of this area.
      cy.checkA11yAA('[data-cy="stats-page"]');
    });
  });
});
