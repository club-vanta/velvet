import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { makeGeocodeResult, makeMeetup } from "@/tests/factories";
import type { Schema } from "@/tests/factories";
import { apiUrlPattern } from "../../../../cypress/support/commands/api";
import { useMeetup } from "../api/useMeetup";
import { MeetupLocation } from "./MeetupLocation";

const MEETUP_PATH = "/organizations/{org_id}/meetups/{meetup_id}" as const;
const SAVE_PATH =
  "/organizations/{org_id}/meetups/{meetup_id}/location" as const;
const CALLAO = makeGeocodeResult({
  label: "Av. Callao 500, Buenos Aires",
  latitude: -34.605,
  longitude: -58.392,
});
const UNSET = makeMeetup();
const LOCATED = makeMeetup({
  location_label: "Teatro Vanta, Buenos Aires",
  latitude: -34.6,
  longitude: -58.4,
});
const AT_CALLAO = makeMeetup({
  location_label: CALLAO.label,
  latitude: CALLAO.latitude,
  longitude: CALLAO.longitude,
});

/** The block fed from the meetup query, as on the page, so a save refetches it. */
function FromQuery({ canEdit }: { canEdit: boolean }) {
  const meetupQ = useMeetup("org-1", "meetup-1");
  return meetupQ.data ? (
    <MeetupLocation orgId="org-1" meetup={meetupQ.data} canEdit={canEdit} />
  ) : null;
}

function serve(meetup: Schema<"MeetupPublic">) {
  cy.stubApi("GET", MEETUP_PATH, { body: meetup }).as("meetup");
}

function mount(meetup: Schema<"MeetupPublic">, canEdit = true) {
  serve(meetup);
  cy.mount(
    <div className="@container" data-cy="wrap">
      <Toaster />
      <FromQuery canEdit={canEdit} />
    </div>,
    { as: canEdit ? "orgAdmin" : "staff" },
  );
  cy.wait("@meetup");
}

function pickCallao() {
  cy.stubApi("GET", "/organizations/{org_id}/geocode", { body: [CALLAO] }).as(
    "geocode",
  );
  cy.getBySel("address-search").type("Callao");
  cy.getBySel("address-search-option").contains(CALLAO.label).click();
}

const toast = (type: "success" | "error") =>
  cy.get(`[data-sonner-toast][data-type="${type}"] [data-title]`);

describe("<MeetupLocation />", () => {
  // Toasts live in a module-level store, so clear the last test's ones.
  beforeEach(() => sonner.dismiss());

  it("shows a member the address and its map link, with no edit control", () => {
    mount(LOCATED, false);
    cy.getBySel("meetup-location-label").should(
      "have.text",
      "Teatro Vanta, Buenos Aires",
    );
    cy.getByRole("link", { name: "Open in map: Teatro Vanta, Buenos Aires" })
      .should(
        "have.attr",
        "href",
        "https://www.openstreetmap.org/?mlat=-34.6&mlon=-58.4#map=17/-34.6/-58.4",
      )
      .and("have.attr", "target", "_blank")
      .and("have.attr", "rel", "noreferrer");
    cy.getBySel("address-search").should("not.exist");
    cy.getBySel("meetup-location-change").should("not.exist");
    cy.getBySel("meetup-location-remove").should("not.exist");
  });

  it("tells a member there is no location yet", () => {
    mount(UNSET, false);
    cy.getBySel("meetup-location-none").should("have.text", "No location yet");
    cy.getBySel("meetup-location-map").should("not.exist");
  });

  it("offers an admin the search, and no removal, while there is no location", () => {
    mount(UNSET);
    cy.getBySel("address-search").should("be.visible");
    cy.getBySel("meetup-location-remove").should("not.exist");
    cy.checkA11yAA('[data-cy="wrap"]');
  });

  it("saves a picked address and moves focus to Change location", () => {
    mount(LOCATED);
    cy.stubApi("PATCH", SAVE_PATH, { body: AT_CALLAO }).as("save");
    cy.getBySel("meetup-location-change").click();
    cy.getBySel("address-search").should("be.focused");
    serve(AT_CALLAO);
    pickCallao();
    cy.wait("@save").its("request.body").should("deep.equal", {
      location_label: CALLAO.label,
      latitude: CALLAO.latitude,
      longitude: CALLAO.longitude,
    });
    toast("success").should("have.text", "Location saved");
    cy.wait("@meetup");
    cy.getBySel("address-search").should("not.exist");
    cy.getBySel("meetup-location-change").should("be.focused");
  });

  it("moves focus to Change location when the same address is saved again", () => {
    mount(AT_CALLAO);
    cy.stubApi("PATCH", SAVE_PATH, { body: AT_CALLAO }).as("save");
    cy.getBySel("meetup-location-change").click();
    pickCallao();
    cy.wait("@save");
    cy.getBySel("meetup-location-change").should("be.focused");
  });

  it("removes the location and returns focus to the search", () => {
    mount(LOCATED);
    cy.stubApi("PATCH", SAVE_PATH, { body: UNSET }).as("save");
    serve(UNSET);
    cy.getBySel("meetup-location-remove").click();
    cy.wait("@save").its("request.body").should("deep.equal", {
      location_label: null,
      latitude: null,
      longitude: null,
    });
    toast("success").should("have.text", "Location removed");
    cy.getBySel("address-search").should("be.focused");
  });

  it("closes the change on Cancel and gives focus back to Change location", () => {
    mount(LOCATED);
    cy.getBySel("meetup-location-change").click();
    cy.getBySel("meetup-location-change").should("not.exist");
    cy.getBySel("address-search-cancel").click();
    cy.getBySel("address-search").should("not.exist");
    cy.getBySel("meetup-location-change").should("be.focused");
  });

  it("cancels the change with Escape once the list is closed", () => {
    mount(LOCATED);
    cy.getBySel("meetup-location-change").click();
    cy.stubApi("GET", "/organizations/{org_id}/geocode", { body: [CALLAO] });
    cy.getBySel("address-search").type("Callao");
    cy.getBySel("address-search-option").should("be.visible");
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getBySel("address-search").should("exist");
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.getBySel("address-search").should("not.exist");
  });

  it("keeps focus and ignores a second pick while saving", () => {
    mount(UNSET);
    cy.stubApi("PATCH", SAVE_PATH, { body: AT_CALLAO, delay: 3000 }).as("save");
    pickCallao();
    cy.getBySel("address-search")
      .should("be.focused")
      .and("have.attr", "readonly");
    cy.getBySel("meetup-location-none").should("be.visible");
    cy.get("@save.all").should("have.length", 1);
  });

  it("reports a failed save with the generic message", () => {
    mount(UNSET);
    cy.intercept(
      { method: "PATCH", url: apiUrlPattern(SAVE_PATH) },
      { statusCode: 500, body: {} },
    ).as("save");
    pickCallao();
    cy.wait("@save");
    toast("error").should("have.text", "Could not save the location.");
    toast("success").should("not.exist");
  });
});
