import {
  shouldHaveTable,
  stubArrivals,
  stubNoShows,
  stubWeather,
  visitStats,
} from "../../support/routes/stats";

const pressed = (sel: string, value: "true" | "false") =>
  cy.getBySel(sel).should("have.attr", "aria-pressed", value);

describe("Stats view toggles", () => {
  it("keeps the arrival curve view in the URL through a reload and Back", () => {
    stubArrivals();
    visitStats("/stats?tab=arrivals");
    pressed("stats-arrivals-view-clock", "true");
    cy.getBySel("stats-arrivals-view-offset").click();
    cy.location("search").should("eq", "?tab=arrivals&arrivals_view=offset");
    shouldHaveTable("Arrivals every 15 minutes", [
      ["Time", "Arrivals"],
      ["0:15", "20"],
      ["0:30", "40"],
    ]);
    cy.reload();
    pressed("stats-arrivals-view-offset", "true");
    // The default view is left out of the URL.
    cy.getBySel("stats-arrivals-view-clock").click();
    cy.location("search").should("eq", "?tab=arrivals");
    cy.go("back");
    cy.location("search").should("eq", "?tab=arrivals&arrivals_view=offset");
    pressed("stats-arrivals-view-offset", "true");
  });

  it("keeps the no-show breakdown view in the URL and across tabs", () => {
    stubNoShows();
    stubArrivals();
    visitStats("/stats?tab=no-shows");
    cy.getBySel("stats-noshow-view-share").click();
    cy.location("search").should("eq", "?tab=no-shows&noshow_view=share");
    cy.getBySel("stats-rate-row-MALE")
      .findBySel("stats-rate-value")
      .should("have.text", "42%");
    cy.getBySel("stats-tab-arrivals").click();
    cy.location("search").should("eq", "?tab=arrivals&noshow_view=share");
    cy.getBySel("stats-tab-no-shows").click();
    pressed("stats-noshow-view-share", "true");
  });

  it("opens a shared link on the weather before the start", () => {
    stubWeather();
    visitStats("/stats?tab=weather&weather_window=before");
    pressed("stats-weather-window-before", "true");
    cy.getBySel("stats-band-FROM_10_TO_15")
      .findBySel("stats-band-events")
      .should("have.text", "3");
    cy.getBySel("stats-weather-window-during").click();
    cy.location("search").should("eq", "?tab=weather");
    cy.getBySel("stats-band-FROM_10_TO_15")
      .findBySel("stats-band-events")
      .should("have.text", "0");
  });
});
