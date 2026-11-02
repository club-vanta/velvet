import type { Role } from "../../../src/tests/factories";
import {
  freezeStatsToday,
  stubAttendance,
  statsTitle,
  stubStatsMeetups,
  waitForAnimations,
} from "../../support/routes/stats";

/** Signs in as `role` on the stats day, with the requests the pages make. */
function signIn(role: Role) {
  cy.loginAs(role);
  freezeStatsToday();
  stubStatsMeetups();
  stubAttendance();
  cy.stubApi("GET", "/guests/", { body: { total: 0, guests: [] } });
}

describe("Stats access", () => {
  it("hides the Stats nav from staff and sends /stats to the dashboard", () => {
    signIn("staff");
    cy.visit("/stats");
    cy.location("pathname").should("eq", "/dashboard");
    cy.getByRole("heading", { name: "Dashboard" }).should("be.visible");
    cy.getByRole("link", { name: "Meetups" }).should("be.visible");
    cy.getByRole("link", { name: "Statistics" }).should("not.exist");
    cy.getBySel("stats-filters").should("not.exist");
  });

  (
    [
      ["an org admin", "orgAdmin"],
      ["a site admin", "siteAdmin"],
    ] as const
  ).forEach(([who, role]) => {
    it(`lets ${who} open the stats from the nav`, () => {
      signIn(role);
      cy.visit("/dashboard");
      cy.getByRole("link", { name: "Statistics" }).click();
      cy.location("pathname").should("eq", "/stats");
      statsTitle().should("match", "h1");
      cy.wait("@getAttendance");
      cy.getBySel("stats-headline-attended").should("be.visible");
    });
  });

  it("has no accessibility violations", () => {
    signIn("orgAdmin");
    cy.visit("/stats");
    statsTitle();
    cy.getBySel("stats-headline-attended").should("be.visible");
    waitForAnimations();
    cy.checkA11yAA();
  });
});
