import { WeatherDetails } from "./WeatherDetails";
import { makeEventWeather } from "@/tests/factories";

describe("<WeatherDetails />", () => {
  it("shows the temperatures, the rain and the wind with their units", () => {
    cy.mount(
      <WeatherDetails
        status="OK"
        weather={makeEventWeather({
          avg_temperature: 18.25,
          avg_apparent_temperature: 17,
          rained: true,
          total_precipitation_mm: 2.4,
          max_wind_kmh: 30,
        })}
        canSetLocation
      />,
    );
    cy.getBySel("weather-temperature").should("have.text", "18.3 °C");
    cy.getBySel("weather-feels-like").should("have.text", "17.0 °C");
    cy.getBySel("weather-rain").should("have.text", "It rained, 2.4 mm");
    cy.getBySel("weather-wind").should("have.text", "30.0 km/h");
    cy.getBySel("stats-note").should(
      "have.text",
      "Data: Open-Meteo, the 6 hours from the start",
    );
  });

  it("says a dry night and leaves a missing value as no data", () => {
    cy.mount(
      <WeatherDetails
        status="OK"
        weather={makeEventWeather({
          avg_apparent_temperature: null,
          max_wind_kmh: null,
          rained: false,
          total_precipitation_mm: null,
        })}
        canSetLocation
      />,
    );
    cy.getBySel("weather-feels-like").should("have.text", "No data");
    cy.getBySel("weather-rain").should("have.text", "No rain");
    cy.getBySel("weather-wind").should("have.text", "No data");
  });

  it("says there is no data when nothing about rain is known", () => {
    cy.mount(
      <WeatherDetails
        status="OK"
        weather={makeEventWeather({
          rained: null,
          total_precipitation_mm: null,
        })}
        canSetLocation
      />,
    );
    cy.getBySel("weather-rain").should("have.text", "No data");
  });

  (
    [
      ["NO_LOCATION", true, "Set the location to see the weather"],
      [
        "NO_LOCATION",
        false,
        "An admin can set the location to see the weather",
      ],
      ["PENDING", false, "The weather loads 2 hours after the event ends"],
      ["NOT_FETCHED", false, "The weather has not loaded yet"],
    ] as const
  ).forEach(([status, canSetLocation, reason]) => {
    it(`explains ${status} to ${canSetLocation ? "an admin" : "staff"}`, () => {
      cy.mount(
        <WeatherDetails
          status={status}
          weather={null}
          canSetLocation={canSetLocation}
        />,
      );
      cy.getBySel("weather-reason").should("have.text", reason);
      cy.getBySel("weather-temperature").should("not.exist");
    });
  });

  it("says the weather has not loaded when an OK status comes without a row", () => {
    cy.mount(<WeatherDetails status="OK" weather={null} canSetLocation />);
    cy.getBySel("weather-reason").should(
      "have.text",
      "The weather has not loaded yet",
    );
  });

  it("reads in Spanish with a decimal comma", () => {
    cy.mount(
      <WeatherDetails
        status="OK"
        weather={makeEventWeather()}
        canSetLocation
      />,
      { lang: "es" },
    );
    cy.getBySel("weather-temperature").should("have.text", "12,0 °C");
    cy.getBySel("weather-rain").should("have.text", "No llovió, 0,0 mm");
  });

  it("has no accessibility violations", () => {
    cy.mount(
      <WeatherDetails
        status="OK"
        weather={makeEventWeather()}
        canSetLocation
      />,
    );
    cy.checkA11yAA();
  });
});
