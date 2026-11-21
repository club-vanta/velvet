import {
  makeMeetupStats,
  makeMeetupWeather,
  makeMeetupWeatherStatus,
} from "@/tests/factories";
import { MeetupSummary } from "./MeetupSummary";

const STATS_PATH = "/organizations/{org_id}/meetups/{meetup_id}/stats" as const;
const WEATHER_PATH =
  "/organizations/{org_id}/meetups/{meetup_id}/weather" as const;
const PARAMS = { org_id: "org-1", meetup_id: "meetup-1" };

function stub() {
  cy.stubApi("GET", STATS_PATH, {
    body: makeMeetupStats(),
    params: PARAMS,
  }).as("stats");
  cy.stubApi("GET", WEATHER_PATH, {
    body: makeMeetupWeatherStatus({
      status: "OK",
      weather: makeMeetupWeather(),
    }),
    params: PARAMS,
  }).as("weather");
}

function mount(withStats: boolean) {
  cy.mount(
    <MeetupSummary
      orgId="org-1"
      meetupId="meetup-1"
      isOrgAdmin={false}
      stats={withStats ? { requiresPayment: false } : undefined}
    />,
    { as: "staff" },
  );
}

describe("<MeetupSummary />", () => {
  it("opens on attendance and keeps the weather one tab away", () => {
    stub();
    mount(true);
    cy.wait(["@stats", "@weather"]);
    cy.getBySel("carousel-tab-attendance")
      .should("have.text", "Attendance")
      .and("have.attr", "aria-current", "true");
    cy.getBySel("meetup-stats").should("be.visible");

    cy.getBySel("carousel-tab-weather").should("have.text", "Weather").click();
    cy.getByRole("region", { name: "Weather" }).should("be.visible");
    cy.checkA11yAA();
  });

  it("shows only the weather, with no carousel, when there are no stats", () => {
    stub();
    mount(false);
    cy.wait("@weather");
    cy.getByRole("region", { name: "Weather" }).should("be.visible");
    cy.getBySel("meetup-summary").should("not.exist");
    cy.get("@stats.all").should("have.length", 0);
  });
});
