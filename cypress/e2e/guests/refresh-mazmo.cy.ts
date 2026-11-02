import { makeGuest, makeMazmoRefresh } from "../../../src/tests/factories";
import {
  lastToast,
  shouldListNames,
  stubGuestsPage,
  vanted,
} from "../../support/routes/guests";

const LUNA = makeGuest({ id: "guest-luna", displayname: "Luna" });
const ROBERTO = makeGuest({ id: "guest-roberto", displayname: "Roberto" });

describe("Refreshing guests from Mazmo", () => {
  beforeEach(() => {
    cy.loginAs("staff");
    stubGuestsPage({ guests: [LUNA, ROBERTO], banned: [vanted(ROBERTO)] });
    cy.visit("/guests");
    cy.wait(["@getGuests", "@getBanned"]);
  });

  it("reports the count and refreshes every list that shows guest names", () => {
    cy.stubApi("POST", "/guests/refresh-mazmo", {
      body: makeMazmoRefresh({ total: 2, refreshed: 2 }),
    }).as("refresh");
    const renamed = { ...ROBERTO, displayname: "Roberto Carlos" };
    stubGuestsPage({ guests: [LUNA, renamed], banned: [vanted(renamed)] });

    cy.getBySel("guests-refresh-mazmo").click();

    cy.wait("@refresh");
    lastToast().should("have.text", "Updated 2 guests from Mazmo");
    cy.wait(["@getGuests", "@getBanned"]);
    shouldListNames("guests-directory", ["Luna", "Roberto Carlos"]);
    cy.getBySel("guests-tab-vanted").click();
    shouldListNames("guests-vanted", ["Roberto Carlos"]);
  });

  it("mentions the guests Mazmo didn't return", () => {
    cy.stubApi("POST", "/guests/refresh-mazmo", {
      body: makeMazmoRefresh({ total: 5, refreshed: 3, not_found: 2 }),
    }).as("refresh");

    cy.getBySel("guests-refresh-mazmo").click();

    cy.wait("@refresh");
    lastToast().should(
      "have.text",
      "Updated 3 guests from Mazmo. 2 weren't found and kept their data.",
    );
  });

  it("is disabled while the refresh runs", () => {
    cy.stubApi("POST", "/guests/refresh-mazmo", {
      body: makeMazmoRefresh(),
      delay: 1000,
    }).as("refresh");

    cy.getBySel("guests-refresh-mazmo").click();

    cy.getBySel("guests-refresh-mazmo").should("be.disabled");
    cy.wait("@refresh");
    cy.getBySel("guests-refresh-mazmo").should("be.enabled");
    cy.get("@refresh.all").should("have.length", 1);
  });

  it("says Mazmo is unreachable on a timeout", () => {
    cy.stubApiError("POST", "/guests/refresh-mazmo", {
      statusCode: 504,
      detail: "Gateway Timeout",
    }).as("refresh");

    cy.getBySel("guests-refresh-mazmo").click();

    cy.wait("@refresh");
    lastToast().should("have.text", "Could not connect to Mazmo. Try again.");
  });

  it("shows the backend's detail for other errors", () => {
    cy.stubApiError("POST", "/guests/refresh-mazmo", {
      statusCode: 502,
      detail: "Mazmo answered with an error",
    }).as("refresh");

    cy.getBySel("guests-refresh-mazmo").click();

    cy.wait("@refresh");
    lastToast().should("have.text", "Mazmo answered with an error");
    cy.get("@getGuests.all").should("have.length", 1);
  });

  it("tells staff when the server can't be reached", () => {
    cy.stubApiError("POST", "/guests/refresh-mazmo", {
      statusCode: 0,
      forceNetworkError: true,
    }).as("refresh");

    cy.getBySel("guests-refresh-mazmo").click();

    lastToast().should(
      "have.text",
      "No se pudo conectar con el servidor.\nVerificá tu conexión.",
    );
  });
});
