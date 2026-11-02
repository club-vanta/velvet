import {
  freezeStatsToday,
  LAST_3_MONTHS,
  pick,
  requestQuery,
  stubAttendance,
  stubNoShows,
  visitStats,
  waitForAnimations,
} from "../../support/routes/stats";

/** The period select: its accessible name says the current period. */
const periodSelect = (period: string) =>
  cy.getByRole("combobox", { name: `Period: ${period}`, native: false });

const eventSelect = (event: string) =>
  cy.getByRole("combobox", { name: `Event: ${event}`, native: false });

describe("Stats filters", () => {
  beforeEach(() => {
    stubAttendance();
  });

  describe("period", () => {
    it("opens on the last 3 months of all events, and asks for that period", () => {
      visitStats();
      periodSelect("Last 3 months").should("be.visible");
      eventSelect("All events").should("be.visible");
      requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
      cy.location("search").should("eq", "");
    });

    it("asks for a picked preset and writes it to the URL", () => {
      visitStats();
      cy.wait("@getAttendance");
      pick("stats-period", "stats-period-ytd");
      cy.location("search").should("eq", "?range=ytd");
      periodSelect("This year").should("be.visible");
      requestQuery("@getAttendance").should("deep.equal", {
        from: "2026-01-01",
        to: "2026-04-16",
      });
      pick("stats-period", "stats-period-all");
      cy.location("search").should("eq", "?range=all");
      requestQuery("@getAttendance").should("deep.equal", {});
      pick("stats-period", "stats-period-30d");
      requestQuery("@getAttendance").should("deep.equal", {
        from: "2026-03-17",
        to: "2026-04-16",
      });
      pick("stats-period", "stats-period-12m");
      requestQuery("@getAttendance").should("deep.equal", {
        from: "2025-04-15",
        to: "2026-04-16",
      });
    });

    [
      "?range=bogus",
      "?range=custom&from=garbage&to=2026-03-31",
      "?range=custom&from=2026-02-30&to=2026-03-31",
      "?range=custom&from=2026-03-31&to=2026-03-01",
      "?range=custom&from=2026-03-01",
      "?range=custom",
    ].forEach((search) => {
      it(`falls back to the last 3 months for ${search}`, () => {
        visitStats(`/stats${search}`);
        periodSelect("Last 3 months").should("be.visible");
        cy.getBySel("stats-range-from").should("not.exist");
        requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
      });
    });
  });

  describe("custom range", () => {
    it("starts from the period on screen, with an inclusive end", () => {
      visitStats();
      cy.wait("@getAttendance");
      pick("stats-period", "stats-period-custom");
      cy.location("search").should(
        "eq",
        "?range=custom&from=2026-01-15&to=2026-04-15",
      );
      cy.getBySel("stats-range-from").should("have.value", "2026-01-15");
      cy.getBySel("stats-range-to").should("have.value", "2026-04-15");
    });

    it("starts from the last 3 months when the period was all time", () => {
      visitStats("/stats?range=all");
      pick("stats-period", "stats-period-custom");
      cy.location("search").should(
        "eq",
        "?range=custom&from=2026-01-15&to=2026-04-15",
      );
    });

    it("ties the two dates together so the start cannot pass the end", () => {
      visitStats("/stats?range=custom&from=2026-03-01&to=2026-03-31");
      cy.getBySel("stats-range-from").should("have.attr", "max", "2026-03-31");
      cy.getBySel("stats-range-to").should("have.attr", "min", "2026-03-01");
    });

    it("asks for the picked days, keeping the other params", () => {
      visitStats("/stats?range=custom&from=2026-03-01&to=2026-03-31&keep=1");
      cy.wait("@getAttendance");
      cy.getBySel("stats-range-from").type("2026-03-05");
      cy.location("search").should(
        "eq",
        "?range=custom&from=2026-03-05&to=2026-03-31&keep=1",
      );
      // The end is inclusive on screen and exclusive for the API.
      requestQuery("@getAttendance").should("deep.equal", {
        from: "2026-03-05",
        to: "2026-04-01",
      });
    });

    it("replaces the history entry for each date, so Back leaves the custom range", () => {
      visitStats();
      pick("stats-period", "stats-period-custom");
      cy.getBySel("stats-range-from").type("2026-02-01");
      cy.getBySel("stats-range-to").type("2026-03-01");
      cy.location("search").should(
        "eq",
        "?range=custom&from=2026-02-01&to=2026-03-01",
      );
      cy.go("back");
      cy.location("search").should("eq", "");
      periodSelect("Last 3 months").should("be.visible");
    });

    it("moves the other date along when the range would turn around", () => {
      visitStats("/stats?range=custom&from=2026-03-01&to=2026-03-31");
      cy.getBySel("stats-range-from").type("2026-04-10");
      cy.location("search").should(
        "eq",
        "?range=custom&from=2026-04-10&to=2026-04-10",
      );
      cy.getBySel("stats-range-to").type("2026-02-01");
      cy.location("search").should(
        "eq",
        "?range=custom&from=2026-02-01&to=2026-02-01",
      );
    });
  });

  describe("event", () => {
    it("offers only the finalized events of the period, newest first", () => {
      visitStats();
      cy.wait("@getMeetups");
      cy.getBySel("stats-event").click();
      cy.getByRole("option", { native: false }).should(($options) => {
        expect($options.toArray().map((o) => o.textContent)).to.deep.equal([
          "All events",
          "Alter Abril · 04/04",
          "Alter Marzo · 10/03",
        ]);
      });
    });

    it("offers the events of a wider period once it is picked", () => {
      visitStats("/stats?range=12m");
      cy.getBySel("stats-event").click();
      cy.getBySel("stats-event-m-old").should(
        "have.text",
        "Alter Viejo · 01/11",
      );
      cy.getBySel("stats-event-m-open").should("not.exist");
    });

    it("asks for one event, writes it to the URL, and Back returns to all events", () => {
      visitStats();
      cy.wait("@getAttendance");
      pick("stats-event", "stats-event-m-march");
      cy.location("search").should("eq", "?meetup=m-march");
      eventSelect("Alter Marzo · 10/03").should("be.visible");
      requestQuery("@getAttendance").should("deep.equal", {
        ...LAST_3_MONTHS,
        meetup_id: "m-march",
      });
      // One event has no events count or per-event average.
      cy.getBySel("stats-headline-events").should("not.exist");
      cy.go("back");
      cy.location("search").should("eq", "");
      eventSelect("All events").should("be.visible");
      cy.getBySel("stats-headline-events").should("be.visible");
    });

    it("goes back to all events from the select", () => {
      visitStats("/stats?meetup=m-march");
      eventSelect("Alter Marzo · 10/03").should("be.visible");
      pick("stats-event", "stats-event-all");
      cy.location("search").should("eq", "");
      eventSelect("All events").should("be.visible");
    });

    it("drops the selected event when the period changes", () => {
      visitStats("/stats?meetup=m-march&keep=1");
      eventSelect("Alter Marzo · 10/03").should("be.visible");
      pick("stats-period", "stats-period-30d");
      cy.location("search").should("eq", "?keep=1&range=30d");
      eventSelect("All events").should("be.visible");
    });

    it("waits for the events before asking for a linked event", () => {
      cy.loginAs("orgAdmin");
      freezeStatsToday();
      cy.stubApi("GET", "/organizations/{org_id}/meetups/", {
        body: { total: 0, meetups: [] },
        delay: 1000,
      }).as("getMeetups");
      cy.visit("/stats?meetup=m-march");
      cy.getBySel("stats-attendance-skeleton").should("be.visible");
      cy.wait("@getMeetups");
      // Not an event of the period: dropped, and the period is asked for.
      requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
      cy.location("search").should("eq", "");
    });

    it("drops a linked event that is not one of the period's, without a history entry", () => {
      visitStats("/stats?meetup=m-old");
      cy.location("search").should("eq", "");
      eventSelect("All events").should("be.visible");
      requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
    });

    it("treats an empty event param as all events", () => {
      visitStats("/stats?meetup=");
      eventSelect("All events").should("be.visible");
      requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
    });

    it("keeps a linked event when the events fail, with a retry and a way back", () => {
      cy.loginAs("orgAdmin");
      freezeStatsToday();
      cy.stubApiError("GET", "/organizations/{org_id}/meetups/", {
        statusCode: 500,
      }).as("getMeetups");
      cy.visit("/stats?meetup=m-march");
      cy.wait("@getMeetups");
      cy.getByRole("alert").should(
        "contain.text",
        "Could not load the statistics.",
      );
      cy.location("search").should("eq", "?meetup=m-march");
      cy.getBySel("stats-attendance-skeleton").should("not.exist");
      cy.getBySel("stats-retry").click();
      cy.wait("@getMeetups");
      cy.location("search").should("eq", "?meetup=m-march");
      cy.getBySel("stats-show-all").click();
      cy.location("search").should("eq", "");
      cy.getByRole("alert").should("not.exist");
      requestQuery("@getAttendance").should("deep.equal", LAST_3_MONTHS);
    });
  });

  describe("in the URL", () => {
    const SHARED =
      "/stats?range=custom&from=2026-03-01&to=2026-04-10&meetup=m-march&tab=no-shows";

    it("opens a shared link on the same filters and tab, and keeps them on reload", () => {
      stubNoShows();
      visitStats(SHARED);
      const sameView = () => {
        periodSelect("Custom range").should("be.visible");
        cy.getBySel("stats-range-from").should("have.value", "2026-03-01");
        cy.getBySel("stats-range-to").should("have.value", "2026-04-10");
        eventSelect("Alter Marzo · 10/03").should("be.visible");
        cy.getBySel("stats-tab-no-shows").should(
          "have.attr",
          "aria-selected",
          "true",
        );
        requestQuery("@getNoShows").should("deep.equal", {
          from: "2026-03-01",
          to: "2026-04-11",
          meetup_id: "m-march",
        });
      };
      sameView();
      cy.reload();
      sameView();
      cy.location("search").should("eq", SHARED.slice("/stats".length));
    });

    it("has no accessibility violations with a custom range open", () => {
      visitStats("/stats?range=custom&from=2026-03-01&to=2026-03-31");
      cy.getBySel("stats-headline-attended").should("be.visible");
      cy.getBySel("stats-period").click();
      cy.getByRole("listbox", { native: false }).should("be.visible");
      waitForAnimations();
      cy.checkA11yAA();
    });
  });
});
