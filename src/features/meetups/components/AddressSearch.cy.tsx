import { makeGeocodeResult } from "@/tests/factories";
import { apiUrlPattern } from "../../../../cypress/support/commands/api";
import { AddressSearch } from "./AddressSearch";

const PATH = "/organizations/{org_id}/geocode" as const;
const CORRIENTES = makeGeocodeResult();
const CALLAO = makeGeocodeResult({
  label: "Av. Callao 500, Buenos Aires",
  latitude: -34.605,
  longitude: -58.392,
});

function respond(results = [CORRIENTES, CALLAO], delay?: number) {
  cy.stubApi("GET", PATH, { body: results, delay }).as("geocode");
}

function mount(props: { saving?: boolean; cancellable?: boolean } = {}) {
  cy.mount(
    <div className="@container" data-cy="wrap">
      <AddressSearch
        ref={null}
        orgId="org-1"
        saving={props.saving ?? false}
        onCancel={props.cancellable ? cy.spy().as("onCancel") : undefined}
        onPick={cy.spy().as("onPick")}
      />
    </div>,
  );
}

const box = () =>
  cy.getByRole("combobox", { name: "Search an address", native: false });
const options = () => cy.getBySel("address-search-option");

describe("<AddressSearch />", () => {
  it("makes one request once the typing pauses, with the trimmed query", () => {
    respond();
    mount();
    box().type("  Av. Corrientes ");
    cy.wait("@geocode")
      .its("request.url")
      .should(
        "match",
        /\/organizations\/org-1\/geocode\?q=Av\.(%20|\+)Corrientes$/,
      );
    options().should("have.length", 2);
    cy.get("@geocode.all").should("have.length", 1);
    cy.checkA11yAA('[data-cy="wrap"]');
  });

  it("does not search or show a list below 3 characters", () => {
    respond();
    mount();
    box().type("Av");
    box().should("have.attr", "aria-expanded", "false");
    cy.getBySel("address-search-list").should("not.be.visible");
    cy.get("@geocode.all").should("have.length", 0);
  });

  it("hides the previous results when the input shrinks under 3 characters", () => {
    respond();
    mount();
    box().type("Corr");
    options().should("have.length", 2);
    box().type("{backspace}{backspace}");
    cy.getBySel("address-search-list").should("not.be.visible");
  });

  it("never shows a late answer to an older query", () => {
    cy.intercept(
      { method: "GET", url: apiUrlPattern(PATH), query: { q: "Corrientes" } },
      { body: [CORRIENTES], delay: 1500 },
    ).as("old");
    cy.intercept(
      { method: "GET", url: apiUrlPattern(PATH), query: { q: "Corrientesx" } },
      { body: [CALLAO] },
    ).as("new");
    mount();
    box().type("Corrientes");
    cy.wait("@old");
    box().type("x");
    cy.wait("@new");
    options().should("have.length", 1).and("have.text", CALLAO.label);
  });

  it("picks with the arrow keys and Enter, with the exact values", () => {
    respond();
    mount();
    box().type("Av.");
    options().should("have.length", 2);
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.press(Cypress.Keyboard.Keys.DOWN);
    options().eq(1).should("have.attr", "aria-selected", "true");
    options()
      .eq(1)
      .invoke("attr", "id")
      .then((id) => box().should("have.attr", "aria-activedescendant", id));
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get("@onPick").should("have.been.calledOnceWith", CALLAO);
    box().should("have.value", "");
    cy.getBySel("address-search-list").should("not.be.visible");
  });

  it("wraps in both directions", () => {
    respond();
    mount();
    box().type("Av.");
    options().should("have.length", 2);
    cy.press(Cypress.Keyboard.Keys.UP);
    options().eq(1).should("have.attr", "aria-selected", "true");
    cy.press(Cypress.Keyboard.Keys.DOWN);
    options().eq(0).should("have.attr", "aria-selected", "true");
  });

  it("closes the list on Escape without picking", () => {
    respond();
    mount({ cancellable: true });
    box().type("Av.");
    options().should("have.length", 2);
    cy.press(Cypress.Keyboard.Keys.ESC);
    box().should("have.attr", "aria-expanded", "false");
    cy.get("@onPick").should("not.have.been.called");
    cy.get("@onCancel").should("not.have.been.called");
    // A second Escape, on the closed list, cancels the change.
    cy.press(Cypress.Keyboard.Keys.ESC);
    cy.get("@onCancel").should("have.been.calledOnce");
  });

  it("picks with the mouse", () => {
    respond();
    mount();
    box().type("Av.");
    options().contains(CORRIENTES.label).click();
    cy.get("@onPick").should("have.been.calledOnceWith", CORRIENTES);
  });

  it("resets the highlighted option when the results change", () => {
    respond();
    mount();
    box().type("Av.");
    cy.press(Cypress.Keyboard.Keys.DOWN);
    options().eq(0).should("have.attr", "aria-selected", "true");
    respond([CALLAO]);
    box().type("x");
    options().should("have.length", 1);
    box().should("not.have.attr", "aria-activedescendant");
  });

  it("marks the list busy while the next search loads", () => {
    respond();
    mount();
    box().type("Corr");
    options().should("have.length", 2);
    respond([CALLAO], 2000);
    box().type("i");
    cy.getBySel("address-search-list").should("have.attr", "aria-busy", "true");
  });

  it("says when no address matches", () => {
    respond([]);
    mount();
    box().type("Zzzz");
    cy.getByRole("status", { native: false }).should(
      "have.text",
      "No addresses found",
    );
  });

  it("shows the backend's reason when the search fails, and keeps the field", () => {
    cy.stubApiError("GET", PATH, {
      statusCode: 504,
      detail: "Address search timed out",
    }).as("geocode");
    mount();
    box().type("Corr");
    cy.getByRole("alert", { native: false }).should(
      "have.text",
      "Address search timed out",
    );
    box().should("be.enabled");
  });

  it("falls back to a generic message when the error has no detail", () => {
    cy.intercept(
      { method: "GET", url: apiUrlPattern(PATH) },
      { statusCode: 500, body: {} },
    ).as("geocode");
    mount();
    box().type("Corr");
    cy.getBySel("address-search-error").should(
      "have.text",
      "Could not search the address. Try again.",
    );
  });

  it("stays read-only and ignores picks while saving", () => {
    respond();
    mount({ saving: true });
    box().should("have.attr", "readonly");
    cy.getBySel("address-search-cancel").should("not.exist");
  });

  it("offers Cancel while changing a location", () => {
    mount({ cancellable: true });
    cy.getBySel("address-search-cancel").click();
    cy.get("@onCancel").should("have.been.calledOnce");
  });
});
