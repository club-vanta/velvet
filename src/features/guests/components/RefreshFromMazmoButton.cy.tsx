import { makeMazmoRefresh } from "@/tests/factories";
import { RefreshFromMazmoButton } from "./RefreshFromMazmoButton";

describe("<RefreshFromMazmoButton />", () => {
  it("asks the backend to refresh, and is disabled until it answers", () => {
    cy.stubApi("POST", "/guests/refresh-mazmo", {
      body: makeMazmoRefresh(),
      delay: 500,
    }).as("refresh");
    cy.mount(<RefreshFromMazmoButton />, { as: "staff" });

    cy.getByRole("button", { name: "Sync from Mazmo" }).click();

    cy.getBySel("guests-refresh-mazmo").should("be.disabled");
    cy.wait("@refresh");
    cy.getBySel("guests-refresh-mazmo").should("be.enabled");
  });

  it("is enabled again after a failure", () => {
    cy.stubApiError("POST", "/guests/refresh-mazmo", { statusCode: 504 }).as(
      "refresh",
    );
    cy.mount(<RefreshFromMazmoButton />, { as: "staff" });

    cy.getBySel("guests-refresh-mazmo").click();

    cy.wait("@refresh");
    cy.getBySel("guests-refresh-mazmo").should("be.enabled");
  });

  it("is labelled in Spanish", () => {
    cy.mount(<RefreshFromMazmoButton />, { as: "staff", lang: "es" });
    cy.getBySel("guests-refresh-mazmo").should(
      "have.text",
      "Sincronizar con Mazmo",
    );
    cy.checkA11yAA();
  });
});
