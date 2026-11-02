import {
  makeGeocodeResult,
  makeMeetup,
  type Schema,
  type Role,
} from "../../../src/tests/factories";
import { apiUrlPattern } from "../../support/commands/api";
import {
  expectToast,
  stubMeetupPage,
  visitMeetup,
} from "../../support/routes/meetups";

const CORRIENTES = makeGeocodeResult();
const CALLAO = makeGeocodeResult({
  label: "Av. Callao 500, Buenos Aires",
  latitude: -34.605,
  longitude: -58.392,
});
const UNSET = makeMeetup({ id: "m-1", name: "Alter Night" });
const LOCATED = makeMeetup({
  id: "m-1",
  name: "Alter Night",
  location_label: "Teatro Vanta, Buenos Aires",
  latitude: -34.6,
  longitude: -58.4,
});
const AT_CALLAO = {
  ...UNSET,
  location_label: CALLAO.label,
  latitude: CALLAO.latitude,
  longitude: CALLAO.longitude,
};

function stubGeocode(results = [CORRIENTES, CALLAO]) {
  cy.stubApi("GET", "/organizations/{org_id}/geocode", { body: results }).as(
    "geocode",
  );
}

function stubSaveLocation(saved: Schema<"MeetupPublic"> = AT_CALLAO) {
  cy.stubApi("PATCH", "/organizations/{org_id}/meetups/{meetup_id}/location", {
    body: saved,
    params: { meetup_id: "m-1" },
  }).as("saveLocation");
}

const searchBox = () => cy.getBySel("address-search");

describe("Set a meetup's location", () => {
  beforeEach(() => {
    cy.loginAs("orgAdmin");
  });

  it("searches once the typing settles and saves the picked address", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    stubGeocode();
    stubSaveLocation();

    searchBox().type("Av.");
    cy.wait("@geocode").its("request.query").should("deep.equal", { q: "Av." });
    cy.getBySel("address-search-option").should("have.length", 2);
    searchBox().should("have.attr", "aria-expanded", "true");
    cy.checkA11yAA('[data-cy="meetup-location"]');

    stubMeetupPage({ meetup: AT_CALLAO });
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.getBySel("address-search-option")
      .eq(1)
      .should("have.attr", "aria-selected", "true");
    cy.press(Cypress.Keyboard.Keys.ENTER);

    cy.wait("@saveLocation").its("request.body").should("deep.equal", {
      location_label: CALLAO.label,
      latitude: CALLAO.latitude,
      longitude: CALLAO.longitude,
    });
    expectToast("Location saved");
    // The meetup and its weather are refetched with the new place.
    cy.wait(["@meetup", "@weather"]);
    cy.getBySel("meetup-location-label").should("have.text", CALLAO.label);
    cy.getBySel("meetup-location-map")
      .should(
        "have.attr",
        "href",
        `https://www.openstreetmap.org/?mlat=${CALLAO.latitude}&mlon=${CALLAO.longitude}#map=17/${CALLAO.latitude}/${CALLAO.longitude}`,
      )
      .and("have.attr", "target", "_blank");
    searchBox().should("not.exist");
    cy.focused().should("have.attr", "data-cy", "meetup-location-change");
  });

  it("saves an address picked with the mouse", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    stubGeocode();
    stubSaveLocation({
      ...UNSET,
      location_label: CORRIENTES.label,
      latitude: CORRIENTES.latitude,
      longitude: CORRIENTES.longitude,
    });

    searchBox().type("Corrientes");
    cy.wait("@geocode");
    cy.getBySel("address-search-option").contains(CORRIENTES.label).click();
    cy.wait("@saveLocation")
      .its("request.body.location_label")
      .should("equal", CORRIENTES.label);
  });

  it("does not search below three characters", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    stubGeocode();

    searchBox().type("Av");
    searchBox().should("have.attr", "aria-expanded", "false");
    cy.getBySel("address-search-option").should("not.exist");
    cy.get("@geocode.all").should("have.length", 0);
  });

  it("says when no address matches", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    stubGeocode([]);

    searchBox().type("Zzzz");
    cy.wait("@geocode");
    cy.getBySel("address-search-empty").should(
      "have.text",
      "No addresses found",
    );
  });

  it("shows the backend's reason when the search fails, and keeps the field", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    cy.stubApiError("GET", "/organizations/{org_id}/geocode", {
      statusCode: 502,
      detail: "Address search unavailable",
    }).as("geocode");

    searchBox().type("Corr");
    cy.getBySel("address-search-error").should(
      "have.text",
      "Address search unavailable",
    );
    searchBox().should("be.enabled");
  });

  it("falls back to a generic message when the search fails without a reason", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    cy.intercept(
      { method: "GET", url: apiUrlPattern("/organizations/{org_id}/geocode") },
      { statusCode: 500, body: {} },
    ).as("geocode");

    searchBox().type("Corr");
    cy.getBySel("address-search-error").should(
      "have.text",
      "Could not search the address. Try again.",
    );
  });

  it("reports a failed save and keeps the search", () => {
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    stubGeocode();
    cy.stubApiError(
      "PATCH",
      "/organizations/{org_id}/meetups/{meetup_id}/location",
      { statusCode: 422, detail: "Latitude out of range" },
    ).as("saveLocation");

    searchBox().type("Av.");
    cy.wait("@geocode");
    cy.getBySel("address-search-option").first().click();
    cy.wait("@saveLocation");
    expectToast("Latitude out of range", "error");
    searchBox().should("be.visible");
  });

  it("changes a location through the same search, or cancels back", () => {
    stubMeetupPage({ meetup: LOCATED });
    visitMeetup("m-1");

    searchBox().should("not.exist");
    cy.getBySel("meetup-location-change").click();
    searchBox().should("be.focused");
    cy.getBySel("meetup-location-change").should("not.exist");
    cy.getBySel("address-search-cancel").click();
    searchBox().should("not.exist");
    cy.focused().should("have.attr", "data-cy", "meetup-location-change");

    // Escape on a closed list cancels too.
    cy.getBySel("meetup-location-change").click();
    searchBox().should("be.focused");
    cy.press(Cypress.Keyboard.Keys.ESC);
    searchBox().should("not.exist");
  });

  it("removes the location", () => {
    stubMeetupPage({ meetup: LOCATED });
    visitMeetup("m-1");
    stubSaveLocation(UNSET);
    stubMeetupPage({ meetup: UNSET });

    cy.getBySel("meetup-location-remove").click();
    cy.wait("@saveLocation").its("request.body").should("deep.equal", {
      location_label: null,
      latitude: null,
      longitude: null,
    });
    expectToast("Location removed");
    cy.wait("@meetup");
    cy.getBySel("meetup-location-label").should("not.exist");
    searchBox().should("be.focused");
  });
});

describe("Location by role", () => {
  const cases: { role: Role; admin: boolean }[] = [
    { role: "staff", admin: false },
    { role: "orgAdmin", admin: true },
    { role: "siteAdmin", admin: true },
  ];
  cases.forEach(({ role, admin }) => {
    it(`${admin ? "lets" : "does not let"} ${role} edit the location`, () => {
      cy.loginAs(role);
      stubMeetupPage({ meetup: LOCATED });
      visitMeetup("m-1");

      cy.getByRole("link", {
        name: "Open in map: Teatro Vanta, Buenos Aires",
      }).should("be.visible");
      cy.getBySel("meetup-location-change").should(
        admin ? "be.visible" : "not.exist",
      );
      cy.getBySel("meetup-location-remove").should(
        admin ? "be.visible" : "not.exist",
      );
    });
  });

  it("tells staff there is no location yet", () => {
    cy.loginAs("staff");
    stubMeetupPage({ meetup: UNSET });
    visitMeetup("m-1");
    cy.getBySel("meetup-location-none").should("have.text", "No location yet");
    cy.getBySel("address-search").should("not.exist");
  });
});

describe(
  "Location on a phone",
  { viewportWidth: 375, viewportHeight: 812 },
  () => {
    it("sets the location from the stacked header", () => {
      cy.loginAs("orgAdmin");
      stubMeetupPage({ meetup: UNSET });
      visitMeetup("m-1");
      stubGeocode();
      stubSaveLocation();
      stubMeetupPage({ meetup: AT_CALLAO });

      searchBox().type("Callao");
      cy.wait("@geocode");
      cy.getBySel("address-search-option").contains(CALLAO.label).click();
      cy.wait(["@saveLocation", "@meetup"]);
      cy.getBySel("meetup-location-label").should("have.text", CALLAO.label);
    });
  },
);
