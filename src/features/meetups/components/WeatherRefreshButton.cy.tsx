import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { makeMeetupWeather } from "@/tests/factories";
import { apiUrlPattern } from "../../../../cypress/support/commands/api";
import { WeatherRefreshButton } from "./WeatherRefreshButton";

const PATH =
  "/organizations/{org_id}/meetups/{meetup_id}/weather/refresh" as const;

function mount() {
  cy.mount(
    <>
      <Toaster />
      <WeatherRefreshButton orgId="org-1" meetupId="meetup-1" />
    </>,
  );
}

const toast = (type: "success" | "error") =>
  cy.get(`[data-sonner-toast][data-type="${type}"] [data-title]`);

describe("<WeatherRefreshButton />", () => {
  // Toasts live in a module-level store, so clear the last test's ones.
  beforeEach(() => sonner.dismiss());

  it("posts the refresh for the meetup and says it worked", () => {
    cy.stubApi("POST", PATH, {
      body: makeMeetupWeather(),
      params: { org_id: "org-1", meetup_id: "meetup-1" },
    }).as("refresh");
    mount();
    cy.getByRole("button", { name: "Update weather" }).click();
    cy.wait("@refresh");
    toast("success").should("have.text", "Weather updated");
  });

  it("is busy and inert while refreshing, and keeps focus", () => {
    cy.stubApi("POST", PATH, { body: makeMeetupWeather(), delay: 800 }).as(
      "refresh",
    );
    mount();
    cy.getBySel("weather-refresh").click();
    cy.getBySel("weather-refresh")
      .should("have.attr", "aria-busy", "true")
      .and("have.attr", "aria-disabled", "true")
      .and("be.focused");
    cy.getBySel("weather-refresh").click();
    cy.wait("@refresh");
    cy.getBySel("weather-refresh")
      .should("have.attr", "aria-busy", "false")
      .and("have.attr", "aria-disabled", "false")
      .and("be.focused");
    cy.get("@refresh.all").should("have.length", 1);
  });

  (
    [
      [
        409,
        "Cannot refresh weather: it is available 8 hours after the event starts (from 2026-03-07T07:00:00Z). Try again then.",
      ],
      [502, "Open-Meteo has no data for that place"],
      [
        504,
        "Cannot refresh weather: the weather provider did not respond in time. Try again in a moment.",
      ],
    ] as const
  ).forEach(([statusCode, detail]) => {
    it(`shows the backend's message on a ${statusCode}`, () => {
      cy.stubApiError("POST", PATH, { statusCode, detail }).as("refresh");
      mount();
      cy.getBySel("weather-refresh").click();
      cy.wait("@refresh");
      toast("error").should("have.text", detail);
      toast("success").should("not.exist");
    });
  });

  it("falls back to a generic message when the error has no detail", () => {
    cy.intercept(
      { method: "POST", url: apiUrlPattern(PATH) },
      { statusCode: 500, body: {} },
    ).as("refresh");
    mount();
    cy.getBySel("weather-refresh").click();
    cy.wait("@refresh");
    toast("error").should("have.text", "Failed to update the weather.");
  });
});
