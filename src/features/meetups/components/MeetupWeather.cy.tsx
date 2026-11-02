import {
  makeMeetupWeather,
  makeMeetupWeatherStatus,
  type Schema,
} from "@/tests/factories";
import { MeetupWeather } from "./MeetupWeather";

const PATH = "/organizations/{org_id}/meetups/{meetup_id}/weather" as const;
const OK = makeMeetupWeatherStatus({
  status: "OK",
  weather: makeMeetupWeather(),
});

function respond(body: Schema<"MeetupWeatherStatusPublic">) {
  cy.stubApi("GET", PATH, {
    body,
    params: { org_id: "org-1", meetup_id: "meetup-1" },
  }).as("weather");
}

function mount(canRefresh = true, lang: "en" | "es" = "en") {
  cy.mount(
    <MeetupWeather orgId="org-1" meetupId="meetup-1" canRefresh={canRefresh} />,
    { lang },
  );
}

const card = () => cy.getByRole("region", { name: /^(Weather|Clima)$/ });
// WeatherDetails is shared and names its values with data-slot.
const value = (slot: string) => card().find(`[data-slot="weather-${slot}"]`);

describe("<MeetupWeather />", () => {
  it("asks for the meetup's weather and titles the card with an h2", () => {
    respond(OK);
    mount();
    cy.wait("@weather");
    card().within(() =>
      cy.getByRole("heading", { name: "Weather" }).should("match", "h2"),
    );
    cy.checkA11yAA();
  });

  it("shows each value with one decimal and its unit, and the source", () => {
    respond(OK);
    mount();
    value("temperature").should("have.text", "22.5 °C");
    value("feels-like").should("have.text", "24.0 °C");
    value("rain").should("have.text", "It rained, 3.2 mm");
    value("wind").should("have.text", "18.8 km/h");
    card().should(
      "contain.text",
      "Data: Open-Meteo, the 6 hours from the start",
    );
  });

  it("formats numbers with the Spanish separator", () => {
    respond(OK);
    mount(true, "es");
    value("temperature").should("have.text", "22,5 °C");
    value("rain").should("have.text", "Llovió, 3,2 mm");
  });

  it("says it did not rain, or only the amount when the verdict is unknown", () => {
    respond({
      ...OK,
      weather: makeMeetupWeather({ rained: false, total_precipitation_mm: 0 }),
    });
    mount();
    value("rain").should("have.text", "No rain, 0.0 mm");
  });

  it("shows the amount alone when only the verdict is unknown", () => {
    respond({
      ...OK,
      weather: makeMeetupWeather({ rained: null, total_precipitation_mm: 1 }),
    });
    mount();
    value("rain").should("have.text", "1.0 mm");
  });

  it("shows No data for every missing value", () => {
    respond({
      ...OK,
      weather: makeMeetupWeather({
        avg_temperature: null,
        avg_apparent_temperature: null,
        total_precipitation_mm: null,
        max_wind_kmh: null,
        rained: null,
      }),
    });
    mount(true, "es");
    ["temperature", "feels-like", "rain", "wind"].forEach((slot) =>
      value(slot).should("have.text", "Sin dato"),
    );
  });

  (
    [
      ["NO_LOCATION", false, "Set the location to see the weather"],
      ["PENDING", false, "The weather loads 2 hours after the event ends"],
      ["NOT_FETCHED", true, "The weather has not loaded yet"],
    ] as const
  ).forEach(([status, ready, reason]) => {
    it(`shows the reason instead of values when ${status}`, () => {
      respond(makeMeetupWeatherStatus({ status, ready }));
      mount();
      card().should("contain.text", reason);
      value("temperature").should("not.exist");
      cy.getBySel("weather-refresh").should(ready ? "exist" : "not.exist");
    });
  });

  it("tells staff that an admin sets the location, with no refresh", () => {
    respond(makeMeetupWeatherStatus({ status: "NO_LOCATION", ready: false }));
    mount(false);
    card().should(
      "contain.text",
      "An admin can set the location to see the weather",
    );
  });

  it("never offers the refresh to staff", () => {
    respond(OK);
    mount(false);
    value("temperature").should("be.visible");
    cy.getBySel("weather-refresh").should("not.exist");
  });

  it("shows a busy, labelled placeholder before the data arrives", () => {
    cy.stubApi("GET", PATH, { body: OK, delay: 800 }).as("weather");
    mount();
    cy.getByRole("status", { name: "Weather", native: false }).should(
      "have.attr",
      "aria-busy",
      "true",
    );
    cy.getBySel("weather-refresh").should("not.exist");
    cy.wait("@weather");
  });

  it("keeps showing the data when a background refetch fails", () => {
    respond(OK);
    mount();
    value("temperature").should("have.text", "22.5 °C");
    cy.stubApiError("GET", PATH, { statusCode: 500 }).as("weatherFailed");
    // Coming back to the tab refetches stale queries.
    cy.window().then((win) => win.dispatchEvent(new Event("visibilitychange")));
    cy.wait("@weatherFailed");
    value("temperature").should("have.text", "22.5 °C");
    cy.getBySel("meetup-weather-error").should("not.exist");
  });

  it("shows an error with a retry that loads again", () => {
    cy.stubApiError("GET", PATH, { statusCode: 500 }).as("weather");
    mount();
    cy.getByRole("alert", { native: false })
      .should("contain.text", "Failed to load the weather.")
      .and("have.attr", "data-cy", "meetup-weather-error");
    cy.getBySel("weather-refresh").should("not.exist");
    respond(OK);
    cy.getByRole("button", { name: "Retry" }).click();
    value("temperature").should("have.text", "22.5 °C");
  });
});
