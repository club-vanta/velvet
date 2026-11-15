import {
  makeArrivalStats,
  makeEventWeatherStats,
} from "../../../src/tests/factories";
import {
  pick,
  requestQuery,
  shouldShowHeadline,
  stubArrivals,
  stubWeather,
  visitStats,
  waitForAnimations,
} from "../../support/routes/stats";

const EVENT_ARRIVALS = makeArrivalStats({
  curve: [
    { start_minute: -30, arrivals: 2 },
    { start_minute: 0, arrivals: 9 },
    { start_minute: 15, arrivals: 12 },
  ],
});

const tooltipLines = (lines: string[]) =>
  cy.getBySel("stats-tooltip-line").should(($lines) => {
    expect($lines.toArray().map((li) => li.textContent)).to.deep.equal(lines);
  });

describe("Stats weather", () => {
  it("opens one event's weather from the event filter, with its arrivals", () => {
    stubWeather();
    visitStats("/stats?tab=weather");
    cy.getByRole("region", { name: "Attendance by temperature" }).should(
      "be.visible",
    );
    stubWeather(makeEventWeatherStats());
    stubArrivals(EVENT_ARRIVALS);
    pick("stats-event", "stats-event-m-march");
    requestQuery("@getArrivals").should("deep.equal", {
      from: "2026-01-15",
      to: "2026-04-16",
      meetup_id: "m-march",
    });
    shouldShowHeadline("weather-before", {
      label: "Before the start · 19:00 to 22:00",
      value: "4.1 mm of rain",
      subline: "13.0 °C, felt like 10.0 °C",
    });
    shouldShowHeadline("weather-during", {
      label: "During · 22:00 to 04:00",
      value: "No rain",
    });
    cy.getBySel("stats-meteogram-arrivals").should("be.visible");
  });

  describe("the meteogram", () => {
    beforeEach(() => {
      stubWeather(makeEventWeatherStats());
      stubArrivals(EVENT_ARRIVALS);
    });

    it("shows an hour's weather when the pointer is over it", () => {
      visitStats("/stats?tab=weather&meetup=m-march");
      cy.getBySel("stats-meteogram-temperature")
        .getByRole("application")
        .then(($svg) => {
          const width = $svg.width()!;
          // The middle of the 4th hour (22:00), right of the 32px axis.
          cy.wrap($svg).trigger("mousemove", 32 + (3.5 * (width - 32)) / 9, 40);
        });
      cy.getBySel("stats-tooltip-title").should("have.text", "22:00");
      tooltipLines(["Temperature12.5 °C", "Feels like9.5 °C"]);
    });

    it("walks the hours with the keyboard", () => {
      visitStats("/stats?tab=weather&meetup=m-march");
      cy.getByRole("button", { name: "Zoom in" }).focus();
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getByRole("group", { name: "Hour by hour", native: false }).should(
        "have.focus",
      );
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.getBySel("stats-tooltip-title").should("have.text", "19:00");
      cy.press(Cypress.Keyboard.Keys.RIGHT);
      cy.getBySel("stats-tooltip-title").should("have.text", "20:00");
      tooltipLines(["Temperature13.0 °C", "Feels like10.0 °C"]);
    });

    it("has no accessibility violations", () => {
      visitStats("/stats?tab=weather&meetup=m-march");
      cy.getBySel("stats-meteogram-arrivals").should("be.visible");
      waitForAnimations();
      cy.checkA11yAA();
    });

    context("on a phone", { viewportWidth: 375, viewportHeight: 812 }, () => {
      it("scrolls the hours sideways and zooms them wider", () => {
        visitStats("/stats?tab=weather&meetup=m-march");
        cy.getBySel("stats-meteogram-scroll").should(($scroll) => {
          const el = $scroll[0]!;
          expect(el.scrollWidth).to.be.greaterThan(el.clientWidth);
          expect(el.scrollLeft).to.equal(0);
        });
        // The page itself does not scroll sideways, only the chart.
        cy.document().should((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(375);
        });
        cy.getBySel("stats-meteogram-scroll").scrollTo("right");
        cy.getBySel("stats-meteogram-scroll").should(($scroll) => {
          expect($scroll[0]!.scrollLeft).to.be.greaterThan(0);
        });
        cy.getBySel("stats-meteogram-content").should(
          "have.css",
          "min-width",
          "464px",
        );
        cy.getByRole("button", { name: "Zoom in" }).click();
        cy.getBySel("stats-meteogram-content").should(
          "have.css",
          "min-width",
          "680px",
        );
        cy.getByRole("button", { name: "Zoom out" }).click();
        cy.getBySel("stats-meteogram-content").should(
          "have.css",
          "min-width",
          "464px",
        );
      });

      it("has no accessibility violations", () => {
        visitStats("/stats?tab=weather&meetup=m-march");
        cy.getBySel("stats-meteogram-arrivals").should("be.visible");
        waitForAnimations();
        // The page itself: the Shell's phone header is not part of this area.
        cy.checkA11yAA('[data-cy="stats-page"]');
      });
    });
  });
});
