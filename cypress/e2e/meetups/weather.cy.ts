import {
  makeMeetup,
  makeMeetupWeather,
  makeMeetupWeatherStatus,
  type Role,
} from "../../../src/tests/factories";
import { apiUrlPattern } from "../../support/commands/api";
import {
  expectToast,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const MEETUP = makeMeetup({
  id: "m-1",
  location_label: "Teatro Vanta",
  latitude: -34.6,
  longitude: -58.4,
});
const OK = makeMeetupWeatherStatus({
  status: "OK",
  weather: makeMeetupWeather(),
});

const card = () => cy.getByRole("region", { name: "Weather" });
// WeatherDetails is shared and names its values with data-slot.
const value = (slot: string) => card().find(`[data-slot="weather-${slot}"]`);

describe("Meetup weather", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("shows each value with one decimal and its unit, and cites the source", () => {
    stubMeetupPage({ meetup: MEETUP, weather: OK });
    visitMeetup("m-1");
    cy.wait("@weather");

    card().within(() => {
      cy.getByRole("heading", { name: "Weather" }).should("be.visible");
      cy.contains("Data: Open-Meteo, the 6 hours from the start").should(
        "be.visible",
      );
    });
    value("temperature").should("have.text", "22.5 °C");
    value("feels-like").should("have.text", "24.0 °C");
    value("rain").should("have.text", "It rained, 3.2 mm");
    value("wind").should("have.text", "18.8 km/h");
  });

  (
    [
      ["NO_LOCATION", false, "Set the location to see the weather"],
      ["PENDING", false, "The weather loads 2 hours after the event ends"],
      ["NOT_FETCHED", true, "The weather has not loaded yet"],
    ] as const
  ).forEach(([status, ready, reason]) => {
    it(`says why there is no weather when ${status}`, () => {
      stubMeetupPage({
        meetup: MEETUP,
        weather: makeMeetupWeatherStatus({ status, ready }),
      });
      visitMeetup("m-1");
      cy.wait("@weather");
      card().should("contain.text", reason);
      value("temperature").should("not.exist");
      cy.getBySel("weather-refresh").should(ready ? "be.visible" : "not.exist");
    });
  });

  it("fetches the weather again and shows the new values", () => {
    stubMeetupPage({ meetup: MEETUP });
    visitMeetup("m-1");
    cy.wait("@weather");
    cy.stubApi(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/weather/refresh",
      { body: makeMeetupWeather(), params: { meetup_id: "m-1" }, delay: 500 },
    ).as("refresh");
    stubMeetupPage({ meetup: MEETUP, weather: OK });

    cy.getBySel("weather-refresh")
      .should("have.text", "Update weather")
      .click();
    cy.getBySel("weather-refresh")
      .should("have.attr", "aria-busy", "true")
      .and("have.attr", "aria-disabled", "true")
      .and("be.focused");
    cy.wait("@refresh");
    expectToast("Weather updated");
    cy.wait("@weather");
    value("temperature").should("have.text", "22.5 °C");
    cy.getBySel("weather-refresh").should("have.attr", "aria-busy", "false");
    cy.get("@refresh.all").should("have.length", 1);
  });

  it("shows the backend's reason when the refresh is refused", () => {
    stubMeetupPage({ meetup: MEETUP });
    visitMeetup("m-1");
    cy.stubApiError(
      "POST",
      "/organizations/{org_id}/meetups/{meetup_id}/weather/refresh",
      {
        statusCode: 409,
        detail:
          "Cannot refresh weather: it is available 8 hours after the event starts. Try again then.",
      },
    ).as("refresh");

    cy.getBySel("weather-refresh").click();
    cy.wait("@refresh");
    expectToast(
      "Cannot refresh weather: it is available 8 hours after the event starts. Try again then.",
      "error",
    );
  });

  it("falls back to a generic message when the refresh fails without a reason", () => {
    stubMeetupPage({ meetup: MEETUP });
    visitMeetup("m-1");
    cy.intercept(
      {
        method: "POST",
        url: apiUrlPattern(
          "/organizations/{org_id}/meetups/{meetup_id}/weather/refresh",
        ),
      },
      { statusCode: 504, body: {} },
    ).as("refresh");

    cy.getBySel("weather-refresh").click();
    cy.wait("@refresh");
    expectToast("Failed to update the weather.", "error");
  });

  it("shows a busy placeholder while the weather loads", () => {
    stubMeetupPage({ meetup: MEETUP });
    cy.stubApi("GET", "/organizations/{org_id}/meetups/{meetup_id}/weather", {
      body: OK,
      delay: 800,
    }).as("weather");
    visitMeetup("m-1");

    cy.getBySel("meetup-weather-loading")
      .should("have.attr", "aria-busy", "true")
      .and("have.attr", "role", "status");
    cy.wait("@weather");
    cy.getBySel("meetup-weather-loading").should("not.exist");
  });

  it("shows an error with a retry that loads the weather again", () => {
    stubMeetupPage({ meetup: MEETUP });
    cy.stubApiError(
      "GET",
      "/organizations/{org_id}/meetups/{meetup_id}/weather",
      { statusCode: 500 },
    ).as("weatherFailed");
    visitMeetup("m-1");

    cy.getBySel("meetup-weather-error").should(
      "contain.text",
      "Failed to load the weather.",
    );
    cy.getBySel("weather-refresh").should("not.exist");
    stubMeetupPage({ meetup: MEETUP, weather: OK });
    cy.getBySel("meetup-weather-error").findBySel("retry").click();
    cy.wait("@weather");
    value("temperature").should("have.text", "22.5 °C");
  });
});

describe("Weather by role", () => {
  const cases: { role: Role; admin: boolean }[] = [
    { role: "staff", admin: false },
    { role: "orgAdmin", admin: true },
    { role: "siteAdmin", admin: true },
  ];
  cases.forEach(({ role, admin }) => {
    it(`${admin ? "offers" : "hides"} the refresh for ${role}`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: MEETUP, weather: OK });
      visitMeetup("m-1");
      cy.wait("@weather");
      value("temperature").should("have.text", "22.5 °C");
      cy.getBySel("weather-refresh").should(admin ? "be.visible" : "not.exist");
    });
  });

  it("tells staff that an admin sets the location", () => {
    cy.loginAs("staff");
    stubMeetupPage({
      meetup: MEETUP,
      weather: makeMeetupWeatherStatus({ status: "NO_LOCATION", ready: false }),
    });
    visitMeetup("m-1");
    card().should(
      "contain.text",
      "An admin can set the location to see the weather",
    );
  });
});
