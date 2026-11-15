import { makeEventRetentionStats } from "../../../src/tests/factories";
import {
  pick,
  requestQuery,
  shouldHaveTable,
  shouldShowHeadline,
  stubRetention,
  visitStats,
  waitForAnimations,
} from "../../support/routes/stats";

const mouse = { eventConstructor: "PointerEvent", pointerType: "mouse" };

describe("Stats retention", () => {
  it("shows the cohorts of a period and who stopped coming", () => {
    stubRetention();
    visitStats("/stats?tab=retention");
    cy.getByRole("heading", { name: "Cohorts" }).should("be.visible");
    cy.getBySel("stats-cohort-2026-02").within(() => {
      cy.getBySel("stats-cohort-month").should("have.text", "Feb 2026");
      cy.getBySel("stats-cohort-size").should("have.text", "40");
      cy.getBySel("stats-cohort-retention").first().should("have.text", "50%");
    });
    // A cohort of 4 says little, so it is dimmed.
    cy.getBySel("stats-cohort-2026-03").should(
      "have.class",
      "text-muted-foreground",
    );
    cy.getByRole("region", { name: "Stopped coming" }).within(() => {
      cy.getByRole("link", { name: "Ana" }).should("be.visible");
      cy.getBySel("stats-lapsed-more").should("have.text", "and 3 more");
    });
  });

  describe("one event", () => {
    beforeEach(() => {
      stubRetention(makeEventRetentionStats());
    });

    it("shows who came that night and who came back afterwards", () => {
      visitStats("/stats?tab=retention&meetup=m-march");
      requestQuery("@getRetention").should("deep.equal", {
        from: "2026-01-15",
        to: "2026-04-16",
        meetup_id: "m-march",
      });
      shouldShowHeadline("regulars", {
        label: "Regulars",
        value: "1",
        subline: "20% of all, 6 visits or more",
      });
      cy.getBySel("stats-crowd-band-first")
        .findBySel("stats-crowd-count")
        .should("have.text", "2");
      cy.getBySel("stats-afterwards-m-may")
        .findBySel("stats-afterwards-came")
        .should("have.text", "2 of that night's 5 people came");
      shouldHaveTable("Did they come back?", [
        ["Event", "Date", "From that night", "Who"],
        ["Alter Abril", "4 de abr de 2026", "1", "Dani"],
        ["Alter Mayo", "9 de may de 2026", "2", "Ana, Dani"],
        ["Alter Junio", "6 de jun de 2026", "0", "–"],
      ]);
      cy.getByRole("heading", { name: "Cohorts" }).should("not.exist");
    });

    it("tells who a face is, and closes the card when another event is picked", () => {
      visitStats("/stats?tab=retention&meetup=m-march");
      cy.getBySel("stats-crowd")
        .findBySel("stats-face-g-beto")
        .trigger("pointerover", mouse);
      cy.getBySel("stats-face-card-name").should("have.text", "Beto");
      cy.getBySel("stats-face-card-visit").should(
        "have.text",
        "That night: Visit 4",
      );
      cy.getBySel("stats-face-card-gap").should("have.text", "7 months");
      cy.getBySel("stats-face-card-back").should(
        "have.text",
        "Has not come back yet",
      );
      pick("stats-event", "stats-event-m-april");
      cy.location("search").should("eq", "?tab=retention&meetup=m-april");
      cy.getBySel("stats-crowd").should("be.visible");
      cy.getBySel("stats-face-card-name").should("not.exist");
    });

    it("has no accessibility violations", () => {
      visitStats("/stats?tab=retention&meetup=m-march");
      cy.getBySel("stats-crowd").should("be.visible");
      waitForAnimations();
      cy.checkA11yAA();
    });
  });
});
